import { DeleteSet, AbstractType_, YEvent, Doc, // eslint-disable-line
UpdateEncoderAny_, ID, Struct_ } from '../internals';
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
    changedParentTypes: Map<AbstractType_<YEvent<any>>, YEvent<any>[]>;
    /** Stores meta information on the transaction */
    meta: Map<any, any>;
    /** Whether this change originates from this doc. */
    local: boolean;
    subdocsAdded: Set<Doc>;
    subdocsRemoved: Set<Doc>;
    subdocsLoaded: Set<Doc>;
    _mergeStructs: Struct_[];
    origin: any;
    constructor(doc: Doc, origin: any, local: boolean);
    encodeUpdateMessage(encoder: UpdateEncoderAny_): boolean;
    nextID(): ID;
    /**
     * If `type.parent` was added in current transaction, `type` technically
     * did not change, it was just added and we should not fire events for `type`.
     */
    addChangedType(type: AbstractType_<YEvent<any>>, parentSub: string | null): void;
    static cleanup(transactions: Array<Transaction>, i: number): void;
    /** Implements the functionality of `y.transact(()=>{..})` */
    static transact(doc: Doc, body: (transaction: Transaction) => void, origin?: any, local?: boolean): void;
}
