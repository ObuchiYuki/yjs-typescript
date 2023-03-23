
import {
    writeStructsFromTransaction,
    DeleteSet,
    Item,
    generateNewClientID,
    GC, StructStore, AbstractType_, YEvent, Doc, // eslint-disable-line
    UpdateEncoderAny_, ID, UpdateEncoderV1, UpdateEncoderV2, Struct_
} from '../internals'

import * as lib0 from 'lib0-typescript'

/**
 * A transaction is created for every change on the Yjs model. It is possible
 * to bundle changes on the Yjs model in a single transaction to
 * minimize the number on messages sent and the number of observer calls.
 * If possible the user of this library should bundle as many changes as
 * possible. Here is an example to illustrate the advantages of bundling:
 *
 * @example
 * const map = y.define('map', YMap)
 * // Log content when change is triggered
 * map.observe(() => {
 *     console.log('change triggered')
 * })
 * // Each change on the map type triggers a log message:
 * map.set('a', 0) // => "change triggered"
 * map.set('b', 0) // => "change triggered"
 * // When put in a transaction, it will trigger the log after the transaction:
 * y.transact(() => {
 *     map.set('a', 1)
 *     map.set('b', 1)
 * }) // => "change triggered"
 *
 * @public
 */
export class Transaction {

    /** The Yjs instance. */
    doc: Doc
    
    /** Describes the set of deleted items by ids */
    deleteSet: DeleteSet = new DeleteSet()
    
    /** Holds the state before the transaction started. */
    beforeState: Map<number, number>
    
    /** Holds the state after the transaction. */
    afterState: Map<number, number> = new Map()

    /**
     * All types that were directly modified (property added or child
     * inserted/deleted). New types are not included in this Set.
     * Maps from type to parentSubs (`item.parentSub = null` for YArray)
     */
    changed: Map<AbstractType_<YEvent<any>>, Set<string | null>> = new Map()

    /**
     * Stores the events for the types that observe also child elements.
     * It is mainly used by `observeDeep`.
     */
    changedParentTypes: Map<AbstractType_<YEvent<any>>, YEvent<any>[]> = new Map()

    /** Stores meta information on the transaction */
    meta: Map<any, any> = new Map()

    /** Whether this change originates from this doc. */
    local: boolean

    subdocsAdded: Set<Doc> = new Set()
    subdocsRemoved: Set<Doc> = new Set()
    subdocsLoaded: Set<Doc> = new Set()

    _mergeStructs: Struct_[] = []

    origin: any

    constructor(doc: Doc, origin: any, local: boolean) {
        this.doc = doc
        this.beforeState = doc.store.getStateVector()
        this.origin = origin
        this.local = local
    }

    encodeUpdateMessage(encoder: UpdateEncoderAny_): boolean {
        const hasContent = lib0.any(this.afterState, (clock, client) => this.beforeState.get(client) !== clock)
        if (this.deleteSet.clients.size === 0 && !hasContent) {
            return false
        }
        this.deleteSet.sortAndMerge()
        writeStructsFromTransaction(encoder, this)
        this.deleteSet.encode(encoder)
        return true
    }

    nextID() {
        const y = this.doc
        return new ID(y.clientID, y.store.getState(y.clientID))
    }

    /**
     * If `type.parent` was added in current transaction, `type` technically
     * did not change, it was just added and we should not fire events for `type`.
     */
    addChangedType(type: AbstractType_<YEvent<any>>, parentSub: string | null) {
        const item = type._item
        if (item === null || (item.id.clock < (this.beforeState.get(item.id.client) || 0) && !item.deleted)) {
            lib0.setIfUndefined(this.changed, type, () => new Set()).add(parentSub)
        }
    }

    static cleanup(transactions: Array<Transaction>, i: number) {
        if (i < transactions.length) {
            const transaction = transactions[i]
            const doc = transaction.doc
            const store = doc.store
            const ds = transaction.deleteSet
            const mergeStructs = transaction._mergeStructs
            try {
                ds.sortAndMerge()
                transaction.afterState = transaction.doc.store.getStateVector()
                doc.emit('beforeObserverCalls', [transaction, doc])
                /**
                 * An array of event callbacks.
                 *
                 * Each callback is called even if the other ones throw errors.
                 */
                const fs: Array<(() => void)> = []
                // observe events on changed types
                transaction.changed.forEach((subs, itemtype) =>
                    fs.push(() => {
                        if (itemtype._item === null || !itemtype._item.deleted) {
                            itemtype._callObserver(transaction, subs)
                        }
                    })
                )
                fs.push(() => {
                    // deep observe events
                    transaction.changedParentTypes.forEach((events, type) =>
                        fs.push(() => {
                            // We need to think about the possibility that the user transforms the
                            // Y.Doc in the event.
                            if (type._item === null || !type._item.deleted) {
                                events = events
                                    .filter(event =>
                                        event.target._item === null || !event.target._item.deleted
                                    )
                                events
                                    .forEach(event => {
                                        event.currentTarget = type
                                    })
                                // sort events by path length so that top-level events are fired first.
                                events
                                    .sort((event1, event2) => event1.path.length - event2.path.length)
                                // We don't need to check for events.length
                                // because we know it has at least one element
                                type._dEH.callListeners(events, transaction)
                            }
                        })
                    )
                    fs.push(() => doc.emit('afterTransaction', [transaction, doc]))
                })

                lib0.callAll(fs, [])

            } finally {
                // Replace deleted items with ItemDeleted / GC.
                // This is where content is actually remove from the Yjs Doc.
                if (doc.gc) {
                    ds.tryGCDeleteSet(store, doc.gcFilter)
                }
                ds.tryMerge(store)
                
                // on all affected store.clients props, try to merge
                transaction.afterState.forEach((clock, client) => {
                    const beforeClock = transaction.beforeState.get(client) || 0
                    if (beforeClock !== clock) {
                        const structs = store.clients.get(client) as Array<GC|Item>
                        // we iterate from right to left so we can safely remove entries
                        const firstChangePos = Math.max(StructStore.findIndexSS(structs, beforeClock), 1)
                        
                        for (let i = structs.length - 1; i >= firstChangePos; i--) {
                            Struct_.tryMergeWithLeft(structs, i)
                        }
                    }
                })


                // try to merge mergeStructs
                // @todo: it makes more sense to transform mergeStructs to a DS, sort it, and merge from right to left
                //                but at the moment DS does not handle duplicates
                for (let i = 0; i < mergeStructs.length; i++) {
                    const { client, clock } = mergeStructs[i].id
                    const structs = store.clients.get(client) as Array<GC|Item>
                    const replacedStructPos = StructStore.findIndexSS(structs, clock)
                    if (replacedStructPos + 1 < structs.length) {
                        Struct_.tryMergeWithLeft(structs, replacedStructPos + 1)
                    }
                    if (replacedStructPos > 0) {
                        Struct_.tryMergeWithLeft(structs, replacedStructPos)
                    }
                }
                if (!transaction.local && transaction.afterState.get(doc.clientID) !== transaction.beforeState.get(doc.clientID)) {
                    console.warn('[yjs] Changed the client-id because another client seems to be using it.')
                    doc.clientID = generateNewClientID()
                }

                // @todo Merge all the transactions into one and provide send the data as a single update message
                doc.emit('afterTransactionCleanup', [transaction, doc])

                if (doc.isObserving('update')) {
                    const encoder = new UpdateEncoderV1()
                    const hasContent = transaction.encodeUpdateMessage(encoder)
                    if (hasContent) {
                        doc.emit('update', [encoder.toUint8Array(), transaction.origin, doc, transaction])
                    }
                }
                if (doc.isObserving('updateV2')) {
                    const encoder = new UpdateEncoderV2()
                    const hasContent = transaction.encodeUpdateMessage(encoder)
                    if (hasContent) {
                        doc.emit('updateV2', [encoder.toUint8Array(), transaction.origin, doc, transaction])
                    }
                }
                const { subdocsAdded, subdocsLoaded, subdocsRemoved } = transaction
                if (subdocsAdded.size > 0 || subdocsRemoved.size > 0 || subdocsLoaded.size > 0) {
                    subdocsAdded.forEach(subdoc => {
                        subdoc.clientID = doc.clientID
                        if (subdoc.collectionid == null) {
                            subdoc.collectionid = doc.collectionid
                        }
                        doc.subdocs.add(subdoc)
                    })
                    subdocsRemoved.forEach(subdoc => doc.subdocs.delete(subdoc))
                    doc.emit('subdocs', [{ loaded: subdocsLoaded, added: subdocsAdded, removed: subdocsRemoved }, doc, transaction])
                    subdocsRemoved.forEach(subdoc => subdoc.destroy())
                }
    
                if (transactions.length <= i + 1) {
                    doc._transactionCleanups = []
                    doc.emit('afterAllTransactions', [doc, transactions])
                } else {
                    Transaction.cleanup(transactions, i + 1)
                }
            }
        }
    }
    

    /** Implements the functionality of `y.transact(()=>{..})` */
    static transact(doc: Doc, body: (transaction: Transaction) => void, origin: any = null, local = true) {
        const transactionCleanups = doc._transactionCleanups
        let initialCall = false
        if (doc._transaction === null) {
            initialCall = true
            doc._transaction = new Transaction(doc, origin, local)
            transactionCleanups.push(doc._transaction)
            
            if (transactionCleanups.length === 1) {
                doc.emit('beforeAllTransactions', [doc])
            }
            doc.emit('beforeTransaction', [doc._transaction, doc])
        }
        try {
            body(doc._transaction)
        } finally {
            if (initialCall) {
                const finishCleanup = doc._transaction === transactionCleanups[0]
                doc._transaction = null
                if (finishCleanup) {     
                    Transaction.cleanup(transactionCleanups, 0)
                }
            }
        }
    }


}
