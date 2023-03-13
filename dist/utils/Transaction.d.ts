import { DeleteSet, Item, UpdateEncoderV1, UpdateEncoderV2, StructStore, AbstractType_, __AbstractStruct, YEvent, Doc } from '../internals';
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
export declare class Transaction {
    /** The Yjs instance. */
    doc: Doc;
    /** Describes the set of deleted items by ids */
    deleteSet: DeleteSet;
    /** Holds the state before the transaction started. */
    beforeState: Map<number, number>;
    /** Holds the state after the transaction. */
    afterState: Map<number, number>;
    /**
     * All types that were directly modified (property added or child
     * inserted/deleted). New types are not included in this Set.
     * Maps from type to parentSubs (`item.parentSub = null` for YArray)
     */
    changed: Map<AbstractType_<YEvent<any>>, Set<string | null>>;
    /**
     * Stores the events for the types that observe also child elements.
     * It is mainly used by `observeDeep`.
     */
    changedParentTypes: Map<AbstractType_<YEvent<any>>, Array<YEvent<any>>>;
    /** Stores meta information on the transaction */
    meta: Map<any, any>;
    /** Whether this change originates from this doc. */
    local: boolean;
    subdocsAdded: Set<Doc>;
    subdocsRemoved: Set<Doc>;
    subdocsLoaded: Set<Doc>;
    _mergeStructs: __AbstractStruct[];
    origin: any;
    constructor(doc: Doc, origin: any, local: boolean);
}
/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {Transaction} transaction
 * @return {boolean} Whether data was written.
 */
export declare const writeUpdateMessageFromTransaction: (encoder: UpdateEncoderV1 | UpdateEncoderV2, transaction: Transaction) => boolean;
/**
 * @param {Transaction} transaction
 *
 * @private
 * @function
 */
export declare const nextID: (transaction: Transaction) => import("./ID").ID;
/**
 * If `type.parent` was added in current transaction, `type` technically
 * did not change, it was just added and we should not fire events for `type`.
 *
 * @param {Transaction} transaction
 * @param {AbstractType_<YEvent<any>>} type
 * @param {string|null} parentSub
 */
export declare const addChangedTypeToTransaction: (transaction: Transaction, type: AbstractType_<YEvent<any>>, parentSub: string | null) => void;
/**
 * @param {DeleteSet} ds
 * @param {StructStore} store
 * @param {function(Item):boolean} gcFilter
 */
export declare const tryGc: (ds: DeleteSet, store: StructStore, gcFilter: (arg0: Item) => boolean) => void;
/**
 * Implements the functionality of `y.transact(()=>{..})`
 *
 * @param {Doc} doc
 * @param {function(Transaction):void} f
 * @param {any} [origin=true]
 *
 * @function
 */
export declare const transact: (doc: Doc, f: (arg0: Transaction) => void, origin?: any, local?: boolean) => void;
