import { Item, AbstractType_, Transaction, // eslint-disable-line
Struct_ } from '../internals';
export type YEventDelta = {
    insert?: string | Array<any> | object | AbstractType_<any>;
    retain?: number;
    delete?: number;
    attributes?: {
        [s: string]: any;
    };
};
export type YEventAction = 'add' | 'update' | 'delete';
export type YEventKey = {
    action: YEventAction;
    oldValue: any;
    newValue?: any;
};
export type YEventChange = {
    added: Set<Item>;
    deleted: Set<Item>;
    keys: Map<string, YEventKey>;
    delta: YEventDelta[];
};
/** YEvent describes the changes on a YType. */
export declare class YEvent<T extends AbstractType_<any>> {
    target: T;
    currentTarget: AbstractType_<any>;
    transaction: Transaction;
    _changes: YEventChange | null;
    _keys: Map<string, YEventKey> | null;
    _delta: YEventDelta[] | null;
    /**
     * @param {T} target The changed type.
     * @param {Transaction} transaction
     */
    constructor(target: T, transaction: Transaction);
    /**
     * Computes the path from `y` to the changed type.
     *
     * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
     *
     * The following property holds:
     * @example
     *     let type = y
     *     event.path.forEach(dir => { type = type.get(dir) })
     *     type === event.target // => true
     */
    get path(): (string | number)[];
    /**
     * Check if a struct is deleted by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {Struct_} struct
     * @return {boolean}
     */
    deletes(struct: Struct_): boolean;
    get keys(): Map<string, YEventKey>;
    get delta(): YEventDelta[];
    /**
     * Check if a struct is added by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     */
    adds(struct: Struct_): boolean;
    get changes(): YEventChange;
}
