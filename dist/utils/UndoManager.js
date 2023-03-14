"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndoManager = exports.followRedone = void 0;
const internals_1 = require("../internals");
const lib0 = require("lib0-typescript");
const followRedone = (store, id) => {
    let nextID = id;
    let diff = 0;
    let item = null;
    do {
        if (diff > 0) {
            nextID = new internals_1.ID(nextID.client, nextID.clock + diff);
        }
        item = store.getItem(nextID);
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
/**
 * Fires 'stack-item-added' event when a stack item was added to either the undo- or
 * the redo-stack. You may store additional stack information via the
 * metadata property on `event.stackItem.meta` (it is a `Map` of metadata properties).
 * Fires 'stack-item-popped' event when a stack item was popped from either the
 * undo- or the redo-stack. You may restore the saved stack information from `event.stackItem.meta`.
 *
 * @extends {Observable<'stack-item-added'|'stack-item-popped'|'stack-cleared'|'stack-item-updated'>}
 */
class UndoManager extends lib0.Observable {
    constructor(typeScope, { captureTimeout = 500, captureTransaction = tr => true, deleteFilter = () => true, trackedOrigins = new Set([null]), ignoreRemoteMapChanges = false, doc = (Array.isArray(typeScope) ? typeScope[0].doc : typeScope.doc) } = {}) {
        super();
        this.scope = [];
        this.addToScope(typeScope);
        this.deleteFilter = deleteFilter;
        trackedOrigins.add(this);
        this.trackedOrigins = trackedOrigins;
        this.captureTransaction = captureTransaction;
        this.undoStack = [];
        this.redoStack = [];
        this.undoing = false;
        this.redoing = false;
        this.doc = doc;
        this.lastChange = 0;
        this.ignoreRemoteMapChanges = ignoreRemoteMapChanges;
        this.captureTimeout = captureTimeout;
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
                    insertions.add(client, startClock, len);
                }
            });
            const now = Date.now();
            let didAdd = false;
            if (this.lastChange > 0 && now - this.lastChange < this.captureTimeout && stack.length > 0 && !undoing && !redoing) {
                // append change to last stack op
                const lastOp = stack[stack.length - 1];
                lastOp.deletions = internals_1.DeleteSet.mergeAll([lastOp.deletions, transaction.deleteSet]);
                lastOp.insertions = internals_1.DeleteSet.mergeAll([lastOp.insertions, insertions]);
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
            transaction.deleteSet.iterate(transaction, item => {
                if (item instanceof internals_1.Item && this.scope.some(type => type.isParentOf(item))) {
                    internals_1.Item.keepRecursive(item, true);
                }
            });
            const changeEvent = {
                stackItem: stack[stack.length - 1],
                origin: transaction.origin,
                type: undoing ? 'redo' : 'undo',
                changedParentTypes: transaction.changedParentTypes
            };
            if (didAdd) {
                this.emit('stack-item-added', [changeEvent, this]);
            }
            else {
                this.emit('stack-item-updated', [changeEvent, this]);
            }
        };
        this.doc.on('afterTransaction', this.afterTransactionHandler);
        this.doc.on('destroy', () => {
            this.destroy();
        });
    }
    clearStackItem(tr, stackItem) {
        stackItem.deletions.iterate(tr, item => {
            if (item instanceof internals_1.Item && this.scope.some(type => type.isParentOf(item))) {
                internals_1.Item.keepRecursive(item, false);
            }
        });
    }
    popStackItem(stack, eventType) {
        /** Whether a change happened */
        let result = null;
        /** Keep a reference to the transaction so we can fire the event with the changedParentTypes */
        let _tr = null;
        const doc = this.doc;
        const scope = this.scope;
        doc.transact(transaction => {
            while (stack.length > 0 && result === null) {
                const store = doc.store;
                const stackItem = stack.pop();
                const itemsToRedo = new Set();
                const itemsToDelete = [];
                let performedChange = false;
                stackItem.insertions.iterate(transaction, struct => {
                    if (struct instanceof internals_1.Item) {
                        if (struct.redone !== null) {
                            let { item, diff } = (0, exports.followRedone)(store, struct.id);
                            if (diff > 0) {
                                item = internals_1.StructStore.getItemCleanStart(transaction, new internals_1.ID(item.id.client, item.id.clock + diff));
                            }
                            struct = item;
                        }
                        if (!struct.deleted && scope.some(type => type.isParentOf(struct))) {
                            itemsToDelete.push(struct);
                        }
                    }
                });
                stackItem.deletions.iterate(transaction, struct => {
                    if (struct instanceof internals_1.Item &&
                        scope.some(type => type.isParentOf(struct)) &&
                        // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
                        !stackItem.insertions.isDeleted(struct.id)) {
                        itemsToRedo.add(struct);
                    }
                });
                itemsToRedo.forEach(struct => {
                    performedChange = struct.redo(transaction, itemsToRedo, stackItem.insertions, this.ignoreRemoteMapChanges) !== null || performedChange;
                });
                // We want to delete in reverse order so that children are deleted before
                // parents, so we have more information available when items are filtered.
                for (let i = itemsToDelete.length - 1; i >= 0; i--) {
                    const item = itemsToDelete[i];
                    if (this.deleteFilter(item)) {
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
        }, this);
        if (result != null) {
            const changedParentTypes = _tr.changedParentTypes;
            this.emit('stack-item-popped', [{ stackItem: result, type: eventType, changedParentTypes }, this]);
        }
        return result;
    }
    addToScope(ytypes) {
        ytypes = Array.isArray(ytypes) ? ytypes : [ytypes];
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
                    this.undoStack.forEach(item => this.clearStackItem(tr, item));
                    this.undoStack = [];
                }
                if (clearRedoStack) {
                    this.redoStack.forEach(item => this.clearStackItem(tr, item));
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
            res = this.popStackItem(this.undoStack, 'undo');
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
            res = this.popStackItem(this.redoStack, 'redo');
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
