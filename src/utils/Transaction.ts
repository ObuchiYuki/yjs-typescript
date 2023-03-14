
import {
    writeStructsFromTransaction,
    DeleteSet,
    Item,
    generateNewClientID,
    GC, StructStore, AbstractType_, __AbstractStruct, YEvent, Doc, // eslint-disable-line
    UpdateEncoderAny_, ID, UpdateEncoderV1, UpdateEncoderV2
} from '../internals'

import * as map from 'lib0/map'
import * as math from 'lib0/math'
import * as set from 'lib0/set'
import * as logging from 'lib0/logging'
import { callAll } from 'lib0/function'

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
    changedParentTypes: Map<AbstractType_<YEvent<any>>, Array<YEvent<any>>> = new Map()

    /** Stores meta information on the transaction */
    meta: Map<any, any> = new Map()

    /** Whether this change originates from this doc. */
    local: boolean

    subdocsAdded: Set<Doc> = new Set()
    subdocsRemoved: Set<Doc> = new Set()
    subdocsLoaded: Set<Doc> = new Set()

    _mergeStructs: __AbstractStruct[] = []

    origin: any

    constructor(doc: Doc, origin: any, local: boolean) {
        this.doc = doc
        this.beforeState = doc.store.getStateVector()
        this.origin = origin
        this.local = local
    }
}

/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {Transaction} transaction
 * @return {boolean} Whether data was written.
 */
export const writeUpdateMessageFromTransaction = (encoder: UpdateEncoderAny_, transaction: Transaction): boolean => {
    if (transaction.deleteSet.clients.size === 0 && !map.any(transaction.afterState, (clock, client) => transaction.beforeState.get(client) !== clock)) {
        return false
    }
    transaction.deleteSet.sortAndMerge()
    writeStructsFromTransaction(encoder, transaction)
    transaction.deleteSet.encode(encoder)
    return true
}

/**
 * @param {Transaction} transaction
 *
 * @private
 * @function
 */
export const nextID = (transaction: Transaction) => {
    const y = transaction.doc
    return new ID(y.clientID, y.store.getState(y.clientID))
}

/**
 * If `type.parent` was added in current transaction, `type` technically
 * did not change, it was just added and we should not fire events for `type`.
 *
 * @param {Transaction} transaction
 * @param {AbstractType_<YEvent<any>>} type
 * @param {string|null} parentSub
 */
export const addChangedTypeToTransaction = (transaction: Transaction, type: AbstractType_<YEvent<any>>, parentSub: string | null) => {
    const item = type._item
    if (item === null || (item.id.clock < (transaction.beforeState.get(item.id.client) || 0) && !item.deleted)) {
        map.setIfUndefined(transaction.changed, type, set.create).add(parentSub)
    }
}

/**
 * @param {Array<__AbstractStruct>} structs
 * @param {number} pos
 */
const tryToMergeWithLeft = (structs: Array<__AbstractStruct>, pos: number) => {
    const left = structs[pos - 1]
    const right = structs[pos]
    if (left.deleted === right.deleted && left.constructor === right.constructor) {
        if (left.mergeWith(right)) {
            structs.splice(pos, 1)
            if (right instanceof Item && right.parentSub !== null && (right.parent as AbstractType_<any>)._map.get(right.parentSub) === right) {
                (right.parent as AbstractType_<any>)._map.set(right.parentSub, left as Item)
            }
        }
    }
}

/**
 * @param {DeleteSet} ds
 * @param {StructStore} store
 * @param {function(Item):boolean} gcFilter
 */
const tryGcDeleteSet = (ds: DeleteSet, store: StructStore, gcFilter: (arg0: Item) => boolean) => {
    for (const [client, deleteItems] of ds.clients.entries()) {
        const structs = (store.clients.get(client) as Array<GC|Item>)
        for (let di = deleteItems.length - 1; di >= 0; di--) {
            const deleteItem = deleteItems[di]
            const endDeleteItemClock = deleteItem.clock + deleteItem.len
            for (
                let si = StructStore.findIndexSS(structs, deleteItem.clock), struct = structs[si];
                si < structs.length && struct.id.clock < endDeleteItemClock;
                struct = structs[++si]
            ) {
                const struct = structs[si]
                if (deleteItem.clock + deleteItem.len <= struct.id.clock) {
                    break
                }
                if (struct instanceof Item && struct.deleted && !struct.keep && gcFilter(struct)) {
                    struct.gc(store, false)
                }
            }
        }
    }
}

/**
 * @param {DeleteSet} ds
 * @param {StructStore} store
 */
const tryMergeDeleteSet = (ds: DeleteSet, store: StructStore) => {
    // try to merge deleted / gc'd items
    // merge from right to left for better efficiecy and so we don't miss any merge targets
    ds.clients.forEach((deleteItems, client) => {
        const structs = store.clients.get(client) as Array<GC|Item>
        for (let di = deleteItems.length - 1; di >= 0; di--) {
            const deleteItem = deleteItems[di]
            // start with merging the item next to the last deleted item
            const mostRightIndexToCheck = math.min(structs.length - 1, 1 + StructStore.findIndexSS(structs, deleteItem.clock + deleteItem.len - 1))
            for (
                let si = mostRightIndexToCheck, struct = structs[si];
                si > 0 && struct.id.clock >= deleteItem.clock;
                struct = structs[--si]
            ) {
                tryToMergeWithLeft(structs, si)
            }
        }
    })
}

/**
 * @param {DeleteSet} ds
 * @param {StructStore} store
 * @param {function(Item):boolean} gcFilter
 */
export const tryGc = (ds: DeleteSet, store: StructStore, gcFilter: (arg0: Item) => boolean) => {
    tryGcDeleteSet(ds, store, gcFilter)
    tryMergeDeleteSet(ds, store)
}

/**
 * @param {Array<Transaction>} transactionCleanups
 * @param {number} i
 */
const cleanupTransactions = (transactionCleanups: Array<Transaction>, i: number) => {
    if (i < transactionCleanups.length) {
        const transaction = transactionCleanups[i]
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
             *
             * @type {Array<function():void>}
             */
            const fs = []
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
            callAll(fs, [])
        } finally {
            // Replace deleted items with ItemDeleted / GC.
            // This is where content is actually remove from the Yjs Doc.
            if (doc.gc) {
                tryGcDeleteSet(ds, store, doc.gcFilter)
            }
            tryMergeDeleteSet(ds, store)

            // on all affected store.clients props, try to merge
            transaction.afterState.forEach((clock, client) => {
                const beforeClock = transaction.beforeState.get(client) || 0
                if (beforeClock !== clock) {
                    const structs = store.clients.get(client) as Array<GC|Item>
                    // we iterate from right to left so we can safely remove entries
                    const firstChangePos = math.max(StructStore.findIndexSS(structs, beforeClock), 1)
                    for (let i = structs.length - 1; i >= firstChangePos; i--) {
                        tryToMergeWithLeft(structs, i)
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
                    tryToMergeWithLeft(structs, replacedStructPos + 1)
                }
                if (replacedStructPos > 0) {
                    tryToMergeWithLeft(structs, replacedStructPos)
                }
            }
            if (!transaction.local && transaction.afterState.get(doc.clientID) !== transaction.beforeState.get(doc.clientID)) {
                logging.print(logging.ORANGE, logging.BOLD, '[yjs] ', logging.UNBOLD, logging.RED, 'Changed the client-id because another client seems to be using it.')
                doc.clientID = generateNewClientID()
            }
            // @todo Merge all the transactions into one and provide send the data as a single update message
            doc.emit('afterTransactionCleanup', [transaction, doc])
            if (doc._observers.has('update')) {
                const encoder = new UpdateEncoderV1()
                const hasContent = writeUpdateMessageFromTransaction(encoder, transaction)
                if (hasContent) {
                    doc.emit('update', [encoder.toUint8Array(), transaction.origin, doc, transaction])
                }
            }
            if (doc._observers.has('updateV2')) {
                const encoder = new UpdateEncoderV2()
                const hasContent = writeUpdateMessageFromTransaction(encoder, transaction)
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

            if (transactionCleanups.length <= i + 1) {
                doc._transactionCleanups = []
                doc.emit('afterAllTransactions', [doc, transactionCleanups])
            } else {
                cleanupTransactions(transactionCleanups, i + 1)
            }
        }
    }
}

/**
 * Implements the functionality of `y.transact(()=>{..})`
 *
 * @param {Doc} doc
 * @param {function(Transaction):void} f
 * @param {any} [origin=true]
 *
 * @function
 */
export const transact = (doc: Doc, f: (arg0: Transaction) => void, origin: any = null, local = true) => {
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
        f(doc._transaction)
    } finally {
        if (initialCall) {
            const finishCleanup = doc._transaction === transactionCleanups[0]
            doc._transaction = null
            if (finishCleanup) {
                // The first transaction ended, now process observer calls.
                // Observer call may create new transactions for which we need to call the observers and do cleanup.
                // We don't want to nest these calls, so we execute these calls one after
                // another.
                // Also we need to ensure that all cleanups are called, even if the
                // observes throw errors.
                // This file is full of hacky try {} finally {} blocks to ensure that an
                // event can throw errors and also that the cleanup is called.
                cleanupTransactions(transactionCleanups, 0)
            }
        }
    }
}
