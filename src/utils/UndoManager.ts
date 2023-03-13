import {
    transact,
    createID,
    isParentOf,
    getItemCleanStart,
    Transaction, Doc, Item, GC, DeleteSet, AbstractType_, YEvent,
    StructStore, ID, getItem
} from '../internals'

import * as time from 'lib0/time'
import * as array from 'lib0/array'
import { Observable } from 'lib0/observable'

export const followRedone = (store: StructStore, id: ID): { item: Item, diff: number } => {
    let nextID: ID|null = id
    let diff = 0
    let item: Item | null = null
    do {
        if (diff > 0) { nextID = new ID(nextID.client, nextID.clock + diff) }
        item = getItem(store, nextID)
        diff = nextID.clock - item.id.clock
        nextID = item.redone
    } while (nextID !== null && item instanceof Item)
    
    return { item, diff }
}


class StackItem {
    deletions: DeleteSet
    insertions: DeleteSet

    /** Use this to save and restore metadata like selection range */
    meta: Map<string, any>

    constructor(deletions: DeleteSet, insertions: DeleteSet) {
        this.insertions = insertions
        this.deletions = deletions
        this.meta = new Map()
    }
}

const clearUndoManagerStackItem = (tr: Transaction, um: UndoManager, stackItem: StackItem) => {
    stackItem.deletions.iterate(tr, item => {
        if (item instanceof Item && um.scope.some(type => isParentOf(type, item))) {
            Item.keepRecursive(item, false)
        }
    })
}

const popStackItem = (undoManager: UndoManager, stack: Array<StackItem>, eventType: string): StackItem | null => {
    /** Whether a change happened */
    let result: StackItem | null = null
    /** Keep a reference to the transaction so we can fire the event with the changedParentTypes */
    let _tr: any = null
    const doc = undoManager.doc
    const scope = undoManager.scope
    transact(doc, transaction => {
        while (stack.length > 0 && result === null) {
            const store = doc.store
            const stackItem = stack.pop() as StackItem
            const itemsToRedo = new Set<Item>()
            const itemsToDelete: Item[] = []

            let performedChange = false
            stackItem.insertions.iterate(transaction, struct => {
                if (struct instanceof Item) {
                    if (struct.redone !== null) {
                        let { item, diff } = followRedone(store, struct.id)
                        if (diff > 0) {
                            item = getItemCleanStart(transaction, new ID(item.id.client, item.id.clock + diff))
                        }
                        struct = item
                    }
                    if (!struct.deleted && scope.some(type => isParentOf(type, struct as Item))) {
                        itemsToDelete.push(struct)
                    }
                }
            })
            stackItem.deletions.iterate(transaction, struct => {
                if (
                    struct instanceof Item &&
                    scope.some(type => isParentOf(type, struct)) &&
                    // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
                    !stackItem.insertions.isDeleted(struct.id)
                ) {
                    itemsToRedo.add(struct)
                }
            })
            itemsToRedo.forEach(struct => {
                performedChange = struct.redo(transaction, itemsToRedo, stackItem.insertions, undoManager.ignoreRemoteMapChanges) !== null || performedChange
            })
            // We want to delete in reverse order so that children are deleted before
            // parents, so we have more information available when items are filtered.
            for (let i = itemsToDelete.length - 1; i >= 0; i--) {
                const item = itemsToDelete[i]
                if (undoManager.deleteFilter(item)) {
                    item.delete(transaction)
                    performedChange = true
                }
            }
            result = performedChange ? stackItem : null
        }
        transaction.changed.forEach((subProps, type) => {
            // destroy search marker if necessary
            if (subProps.has(null) && type._searchMarker) {
                type._searchMarker.length = 0
            }
        })
        _tr = transaction
    }, undoManager)
    if (result != null) {
        const changedParentTypes = _tr.changedParentTypes
        undoManager.emit('stack-item-popped', [{ stackItem: result, type: eventType, changedParentTypes }, undoManager])
    }
    return result
}

/**
 * @typedef {Object} UndoManagerOptions
 * @property {number} [UndoManagerOptions.captureTimeout=500]
 * @property {function(Transaction):boolean} [UndoManagerOptions.captureTransaction] Do not capture changes of a Transaction if result false.
 * @property {function(Item):boolean} [UndoManagerOptions.deleteFilter=()=>true] Sometimes
 * it is necessary to filter what an Undo/Redo operation can delete. If this
 * filter returns false, the type/item won't be deleted even it is in the
 * undo/redo scope.
 * @property {Set<any>} [UndoManagerOptions.trackedOrigins=new Set([null])]
 * @property {boolean} [ignoreRemoteMapChanges] Experimental. By default, the UndoManager will never overwrite remote changes. Enable this property to enable overwriting remote changes on key-value changes (Y.Map, properties on Y.Xml, etc..).
 * @property {Doc} [doc] The document that this UndoManager operates on. Only needed if typeScope is empty.
 */

export type UndoManagerOptions = {
    captureTimeout?: number,
    captureTransaction?: (transaction: Transaction) => boolean,
    deleteFilter?: (item: Item) => boolean,
    trackedOrigins?: Set<any>,
    ignoreRemoteMapChanges?: boolean,
    doc?: Doc
}

/**
 * Fires 'stack-item-added' event when a stack item was added to either the undo- or
 * the redo-stack. You may store additional stack information via the
 * metadata property on `event.stackItem.meta` (it is a `Map` of metadata properties).
 * Fires 'stack-item-popped' event when a stack item was popped from either the
 * undo- or the redo-stack. You may restore the saved stack information from `event.stackItem.meta`.
 *
 * @extends {Observable<'stack-item-added'|'stack-item-popped'|'stack-cleared'|'stack-item-updated'>}
 */
export class UndoManager extends Observable<'stack-item-added'|'stack-item-popped'|'stack-cleared'|'stack-item-updated'> {

    scope: AbstractType_<any>[]
    deleteFilter: (item: Item) => boolean
    trackedOrigins: Set<any>
    captureTransaction: (transaction: Transaction) => boolean    
    undoStack: StackItem[]
    redoStack: StackItem[]
    undoing: boolean
    redoing: boolean
    doc: Doc
    lastChange: number
    ignoreRemoteMapChanges: boolean
    captureTimeout: number
    afterTransactionHandler: (transaction: Transaction) => void

    /**
     * @param {AbstractType_<any>|Array<AbstractType_<any>>} typeScope Accepts either a single type, or an array of types
     * @param {UndoManagerOptions} options
     */
    constructor (typeScope: AbstractType_<any> | Array<AbstractType_<any>>, {
        captureTimeout = 500,
        captureTransaction = tr => true,
        deleteFilter = () => true,
        trackedOrigins = new Set([null]),
        ignoreRemoteMapChanges = false,
        doc = (array.isArray(typeScope) ? typeScope[0].doc : typeScope.doc) as Doc
    }: UndoManagerOptions = {}) {
        super()
        this.scope = []
        this.addToScope(typeScope)
        this.deleteFilter = deleteFilter
        trackedOrigins.add(this)
        this.trackedOrigins = trackedOrigins
        this.captureTransaction = captureTransaction
        this.undoStack = []
        this.redoStack = []
        /**
         * Whether the client is currently undoing (calling UndoManager.undo)
         *
         * @type {boolean}
         */
        this.undoing = false
        this.redoing = false
        this.doc = doc
        this.lastChange = 0
        this.ignoreRemoteMapChanges = ignoreRemoteMapChanges
        this.captureTimeout = captureTimeout
        /**
         * @param {Transaction} transaction
         */
        this.afterTransactionHandler = (transaction: Transaction) => {
            // Only track certain transactions
            if (
                !this.captureTransaction(transaction) ||
                !this.scope.some(type => transaction.changedParentTypes.has(type)) ||
                (!this.trackedOrigins.has(transaction.origin) && (!transaction.origin || !this.trackedOrigins.has(transaction.origin.constructor)))
            ) {
                return
            }
            const undoing = this.undoing
            const redoing = this.redoing
            const stack = undoing ? this.redoStack : this.undoStack
            if (undoing) {
                this.stopCapturing() // next undo should not be appended to last stack item
            } else if (!redoing) {
                // neither undoing nor redoing: delete redoStack
                this.clear(false, true)
            }
            const insertions = new DeleteSet()
            transaction.afterState.forEach((endClock, client) => {
                const startClock = transaction.beforeState.get(client) || 0
                const len = endClock - startClock
                if (len > 0) {
                    insertions.add(client, startClock, len)
                }
            })
            const now = time.getUnixTime()
            let didAdd = false
            if (this.lastChange > 0 && now - this.lastChange < this.captureTimeout && stack.length > 0 && !undoing && !redoing) {
                // append change to last stack op
                const lastOp = stack[stack.length - 1]
                lastOp.deletions = DeleteSet.mergeAll([lastOp.deletions, transaction.deleteSet])
                lastOp.insertions = DeleteSet.mergeAll([lastOp.insertions, insertions])
            } else {
                // create a new stack op
                stack.push(new StackItem(transaction.deleteSet, insertions))
                didAdd = true
            }
            if (!undoing && !redoing) {
                this.lastChange = now
            }
            // make sure that deleted structs are not gc'd
            transaction.deleteSet.iterate(transaction, item => {
                if (item instanceof Item && this.scope.some(type => isParentOf(type, item))) {
                    Item.keepRecursive(item, true)
                }
            })
            const changeEvent = [{ stackItem: stack[stack.length - 1], origin: transaction.origin, type: undoing ? 'redo' : 'undo', changedParentTypes: transaction.changedParentTypes }, this]
            if (didAdd) {
                this.emit('stack-item-added', changeEvent)
            } else {
                this.emit('stack-item-updated', changeEvent)
            }
        }
        this.doc.on('afterTransaction', this.afterTransactionHandler)
        this.doc.on('destroy', () => {
            this.destroy()
        })
    }

    addToScope(ytypes: Array<AbstractType_<any>> | AbstractType_<any>) {
        ytypes = array.isArray(ytypes) ? ytypes : [ytypes]
        ytypes.forEach(ytype => {
            if (this.scope.every(yt => yt !== ytype)) {
                this.scope.push(ytype)
            }
        })
    }

    addTrackedOrigin(origin: any) {
        this.trackedOrigins.add(origin)
    }

    removeTrackedOrigin(origin: any) {
        this.trackedOrigins.delete(origin)
    }

    clear (clearUndoStack = true, clearRedoStack = true) {
        if ((clearUndoStack && this.canUndo()) || (clearRedoStack && this.canRedo())) {
            this.doc.transact(tr => {
                if (clearUndoStack) {
                    this.undoStack.forEach(item => clearUndoManagerStackItem(tr, this, item))
                    this.undoStack = []
                }
                if (clearRedoStack) {
                    this.redoStack.forEach(item => clearUndoManagerStackItem(tr, this, item))
                    this.redoStack = []
                }
                this.emit('stack-cleared', [{ undoStackCleared: clearUndoStack, redoStackCleared: clearRedoStack }])
            })
        }
    }

    /**
     * UndoManager merges Undo-StackItem if they are created within time-gap
     * smaller than `options.captureTimeout`. Call `um.stopCapturing()` so that the next
     * StackItem won't be merged.
     *
     *
     * @example
     *         // without stopCapturing
     *         ytext.insert(0, 'a')
     *         ytext.insert(1, 'b')
     *         um.undo()
     *         ytext.toString() // => '' (note that 'ab' was removed)
     *         // with stopCapturing
     *         ytext.insert(0, 'a')
     *         um.stopCapturing()
     *         ytext.insert(0, 'b')
     *         um.undo()
     *         ytext.toString() // => 'a' (note that only 'b' was removed)
     *
     */
    stopCapturing() {
        this.lastChange = 0
    }

    /**
     * Undo last changes on type.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    undo(): StackItem|null {
        this.undoing = true
        let res
        try {
            res = popStackItem(this, this.undoStack, 'undo')
        } finally {
            this.undoing = false
        }
        return res
    }

    /**
     * Redo last undo operation.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    redo(): StackItem | null {
        this.redoing = true
        let res
        try {
            res = popStackItem(this, this.redoStack, 'redo')
        } finally {
            this.redoing = false
        }
        return res
    }

    /**
     * Are undo steps available?
     *
     * @return {boolean} `true` if undo is possible
     */
    canUndo(): boolean {
        return this.undoStack.length > 0
    }

    /**
     * Are redo steps available?
     *
     * @return {boolean} `true` if redo is possible
     */
    canRedo(): boolean {
        return this.redoStack.length > 0
    }

    destroy() {
        this.trackedOrigins.delete(this)
        this.doc.off('afterTransaction', this.afterTransactionHandler)
        super.destroy()
    }
}
