import { Transaction, Doc, Item, DeleteSet, AbstractType_ } from '../internals';
import { Observable } from 'lib0/observable';
declare class StackItem {
    deletions: DeleteSet;
    insertions: DeleteSet;
    /** Use this to save and restore metadata like selection range */
    meta: Map<string, any>;
    constructor(deletions: DeleteSet, insertions: DeleteSet);
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
    captureTimeout?: number;
    captureTransaction?: (transaction: Transaction) => boolean;
    deleteFilter?: (item: Item) => boolean;
    trackedOrigins?: Set<any>;
    ignoreRemoteMapChanges?: boolean;
    doc?: Doc;
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
export declare class UndoManager extends Observable<'stack-item-added' | 'stack-item-popped' | 'stack-cleared' | 'stack-item-updated'> {
    scope: AbstractType_<any>[];
    deleteFilter: (item: Item) => boolean;
    trackedOrigins: Set<any>;
    captureTransaction: (transaction: Transaction) => boolean;
    undoStack: StackItem[];
    redoStack: StackItem[];
    undoing: boolean;
    redoing: boolean;
    doc: Doc;
    lastChange: number;
    ignoreRemoteMapChanges: boolean;
    captureTimeout: number;
    afterTransactionHandler: (transaction: Transaction) => void;
    /**
     * @param {AbstractType_<any>|Array<AbstractType_<any>>} typeScope Accepts either a single type, or an array of types
     * @param {UndoManagerOptions} options
     */
    constructor(typeScope: AbstractType_<any> | Array<AbstractType_<any>>, { captureTimeout, captureTransaction, deleteFilter, trackedOrigins, ignoreRemoteMapChanges, doc }?: UndoManagerOptions);
    addToScope(ytypes: Array<AbstractType_<any>> | AbstractType_<any>): void;
    addTrackedOrigin(origin: any): void;
    removeTrackedOrigin(origin: any): void;
    clear(clearUndoStack?: boolean, clearRedoStack?: boolean): void;
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
    stopCapturing(): void;
    /**
     * Undo last changes on type.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    undo(): StackItem | null;
    /**
     * Redo last undo operation.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    redo(): StackItem | null;
    /**
     * Are undo steps available?
     *
     * @return {boolean} `true` if undo is possible
     */
    canUndo(): boolean;
    /**
     * Are redo steps available?
     *
     * @return {boolean} `true` if redo is possible
     */
    canRedo(): boolean;
    destroy(): void;
}
export {};
