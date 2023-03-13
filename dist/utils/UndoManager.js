"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndoManager = exports.followRedone = void 0;
const internals_1 = require("../internals");
const time = require("lib0/time");
const array = require("lib0/array");
const observable_1 = require("lib0/observable");
const followRedone = (store, id) => {
    let nextID = id;
    let diff = 0;
    let item = null;
    do {
        if (diff > 0) {
            nextID = (0, internals_1.createID)(nextID.client, nextID.clock + diff);
        }
        item = (0, internals_1.getItem)(store, nextID);
        diff = nextID.clock - item.id.clock;
        nextID = item.redone;
    } while (nextID !== null && item instanceof internals_1.Item);
    return { item, diff };
};
exports.followRedone = followRedone;
class StackItem {
    constructor(deletions, insertions) {
        this.insertions = insertions;
        this.deletions = deletions;
        this.meta = new Map();
    }
}
const clearUndoManagerStackItem = (tr, um, stackItem) => {
    (0, internals_1.iterateDeletedStructs)(tr, stackItem.deletions, item => {
        if (item instanceof internals_1.Item && um.scope.some(type => (0, internals_1.isParentOf)(type, item))) {
            internals_1.Item.keepRecursive(item, false);
        }
    });
};
const popStackItem = (undoManager, stack, eventType) => {
    /** Whether a change happened */
    let result = null;
    /** Keep a reference to the transaction so we can fire the event with the changedParentTypes */
    let _tr = null;
    const doc = undoManager.doc;
    const scope = undoManager.scope;
    (0, internals_1.transact)(doc, transaction => {
        while (stack.length > 0 && result === null) {
            const store = doc.store;
            const stackItem = stack.pop();
            const itemsToRedo = new Set();
            const itemsToDelete = [];
            let performedChange = false;
            (0, internals_1.iterateDeletedStructs)(transaction, stackItem.insertions, struct => {
                if (struct instanceof internals_1.Item) {
                    if (struct.redone !== null) {
                        let { item, diff } = (0, exports.followRedone)(store, struct.id);
                        if (diff > 0) {
                            item = (0, internals_1.getItemCleanStart)(transaction, (0, internals_1.createID)(item.id.client, item.id.clock + diff));
                        }
                        struct = item;
                    }
                    if (!struct.deleted && scope.some(type => (0, internals_1.isParentOf)(type, struct))) {
                        itemsToDelete.push(struct);
                    }
                }
            });
            (0, internals_1.iterateDeletedStructs)(transaction, stackItem.deletions, struct => {
                if (struct instanceof internals_1.Item &&
                    scope.some(type => (0, internals_1.isParentOf)(type, struct)) &&
                    // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
                    !(0, internals_1.isDeleted)(stackItem.insertions, struct.id)) {
                    itemsToRedo.add(struct);
                }
            });
            itemsToRedo.forEach(struct => {
                performedChange = struct.redo(transaction, itemsToRedo, stackItem.insertions, undoManager.ignoreRemoteMapChanges) !== null || performedChange;
            });
            // We want to delete in reverse order so that children are deleted before
            // parents, so we have more information available when items are filtered.
            for (let i = itemsToDelete.length - 1; i >= 0; i--) {
                const item = itemsToDelete[i];
                if (undoManager.deleteFilter(item)) {
                    item.delete(transaction);
                    performedChange = true;
                }
            }
            result = performedChange ? stackItem : null;
        }
        transaction.changed.forEach((subProps, type) => {
            // destroy search marker if necessary
            if (subProps.has(null) && type._searchMarker) {
                type._searchMarker.length = 0;
            }
        });
        _tr = transaction;
    }, undoManager);
    if (result != null) {
        const changedParentTypes = _tr.changedParentTypes;
        undoManager.emit('stack-item-popped', [{ stackItem: result, type: eventType, changedParentTypes }, undoManager]);
    }
    return result;
};
/**
 * Fires 'stack-item-added' event when a stack item was added to either the undo- or
 * the redo-stack. You may store additional stack information via the
 * metadata property on `event.stackItem.meta` (it is a `Map` of metadata properties).
 * Fires 'stack-item-popped' event when a stack item was popped from either the
 * undo- or the redo-stack. You may restore the saved stack information from `event.stackItem.meta`.
 *
 * @extends {Observable<'stack-item-added'|'stack-item-popped'|'stack-cleared'|'stack-item-updated'>}
 */
class UndoManager extends observable_1.Observable {
    /**
     * @param {AbstractType_<any>|Array<AbstractType_<any>>} typeScope Accepts either a single type, or an array of types
     * @param {UndoManagerOptions} options
     */
    constructor(typeScope, { captureTimeout = 500, captureTransaction = tr => true, deleteFilter = () => true, trackedOrigins = new Set([null]), ignoreRemoteMapChanges = false, doc = (array.isArray(typeScope) ? typeScope[0].doc : typeScope.doc) } = {}) {
        super();
        this.scope = [];
        this.addToScope(typeScope);
        this.deleteFilter = deleteFilter;
        trackedOrigins.add(this);
        this.trackedOrigins = trackedOrigins;
        this.captureTransaction = captureTransaction;
        this.undoStack = [];
        this.redoStack = [];
        /**
         * Whether the client is currently undoing (calling UndoManager.undo)
         *
         * @type {boolean}
         */
        this.undoing = false;
        this.redoing = false;
        this.doc = doc;
        this.lastChange = 0;
        this.ignoreRemoteMapChanges = ignoreRemoteMapChanges;
        this.captureTimeout = captureTimeout;
        /**
         * @param {Transaction} transaction
         */
        this.afterTransactionHandler = (transaction) => {
            // Only track certain transactions
            if (!this.captureTransaction(transaction) ||
                !this.scope.some(type => transaction.changedParentTypes.has(type)) ||
                (!this.trackedOrigins.has(transaction.origin) && (!transaction.origin || !this.trackedOrigins.has(transaction.origin.constructor)))) {
                return;
            }
            const undoing = this.undoing;
            const redoing = this.redoing;
            const stack = undoing ? this.redoStack : this.undoStack;
            if (undoing) {
                this.stopCapturing(); // next undo should not be appended to last stack item
            }
            else if (!redoing) {
                // neither undoing nor redoing: delete redoStack
                this.clear(false, true);
            }
            const insertions = new internals_1.DeleteSet();
            transaction.afterState.forEach((endClock, client) => {
                const startClock = transaction.beforeState.get(client) || 0;
                const len = endClock - startClock;
                if (len > 0) {
                    (0, internals_1.addToDeleteSet)(insertions, client, startClock, len);
                }
            });
            const now = time.getUnixTime();
            let didAdd = false;
            if (this.lastChange > 0 && now - this.lastChange < this.captureTimeout && stack.length > 0 && !undoing && !redoing) {
                // append change to last stack op
                const lastOp = stack[stack.length - 1];
                lastOp.deletions = (0, internals_1.mergeDeleteSets)([lastOp.deletions, transaction.deleteSet]);
                lastOp.insertions = (0, internals_1.mergeDeleteSets)([lastOp.insertions, insertions]);
            }
            else {
                // create a new stack op
                stack.push(new StackItem(transaction.deleteSet, insertions));
                didAdd = true;
            }
            if (!undoing && !redoing) {
                this.lastChange = now;
            }
            // make sure that deleted structs are not gc'd
            (0, internals_1.iterateDeletedStructs)(transaction, transaction.deleteSet, /** @param {Item|GC} item */ /** @param {Item|GC} item */ item => {
                if (item instanceof internals_1.Item && this.scope.some(type => (0, internals_1.isParentOf)(type, item))) {
                    internals_1.Item.keepRecursive(item, true);
                }
            });
            const changeEvent = [{ stackItem: stack[stack.length - 1], origin: transaction.origin, type: undoing ? 'redo' : 'undo', changedParentTypes: transaction.changedParentTypes }, this];
            if (didAdd) {
                this.emit('stack-item-added', changeEvent);
            }
            else {
                this.emit('stack-item-updated', changeEvent);
            }
        };
        this.doc.on('afterTransaction', this.afterTransactionHandler);
        this.doc.on('destroy', () => {
            this.destroy();
        });
    }
    addToScope(ytypes) {
        ytypes = array.isArray(ytypes) ? ytypes : [ytypes];
        ytypes.forEach(ytype => {
            if (this.scope.every(yt => yt !== ytype)) {
                this.scope.push(ytype);
            }
        });
    }
    addTrackedOrigin(origin) {
        this.trackedOrigins.add(origin);
    }
    removeTrackedOrigin(origin) {
        this.trackedOrigins.delete(origin);
    }
    clear(clearUndoStack = true, clearRedoStack = true) {
        if ((clearUndoStack && this.canUndo()) || (clearRedoStack && this.canRedo())) {
            this.doc.transact(tr => {
                if (clearUndoStack) {
                    this.undoStack.forEach(item => clearUndoManagerStackItem(tr, this, item));
                    this.undoStack = [];
                }
                if (clearRedoStack) {
                    this.redoStack.forEach(item => clearUndoManagerStackItem(tr, this, item));
                    this.redoStack = [];
                }
                this.emit('stack-cleared', [{ undoStackCleared: clearUndoStack, redoStackCleared: clearRedoStack }]);
            });
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
        this.lastChange = 0;
    }
    /**
     * Undo last changes on type.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    undo() {
        this.undoing = true;
        let res;
        try {
            res = popStackItem(this, this.undoStack, 'undo');
        }
        finally {
            this.undoing = false;
        }
        return res;
    }
    /**
     * Redo last undo operation.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    redo() {
        this.redoing = true;
        let res;
        try {
            res = popStackItem(this, this.redoStack, 'redo');
        }
        finally {
            this.redoing = false;
        }
        return res;
    }
    /**
     * Are undo steps available?
     *
     * @return {boolean} `true` if undo is possible
     */
    canUndo() {
        return this.undoStack.length > 0;
    }
    /**
     * Are redo steps available?
     *
     * @return {boolean} `true` if redo is possible
     */
    canRedo() {
        return this.redoStack.length > 0;
    }
    destroy() {
        this.trackedOrigins.delete(this);
        this.doc.off('afterTransaction', this.afterTransactionHandler);
        super.destroy();
    }
}
exports.UndoManager = UndoManager;
