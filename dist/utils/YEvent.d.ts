import { Item, AbstractType_, Transaction, __AbstractStruct } from '../internals';
/** YEvent describes the changes on a YType. */
export declare class YEvent<T extends AbstractType_<any>> {
    target: T;
    currentTarget: AbstractType_<any>;
    transaction: Transaction;
    _changes: object | null;
    _keys: null | Map<string, {
        action: 'add' | 'update' | 'delete';
        oldValue: any;
        newValue: any;
    }>;
    _delta: null | Array<{
        insert?: string | Array<any> | object | AbstractType_<any>;
        retain?: number;
        delete?: number;
        attributes?: {
            [s: string]: any;
        };
    }>;
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
     *     event.path.forEach(dir => {
     *         type = type.get(dir)
     *     })
     *     type === event.target // => true
     */
    get path(): (string | number)[];
    /**
     * Check if a struct is deleted by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {__AbstractStruct} struct
     * @return {boolean}
     */
    deletes(struct: __AbstractStruct): boolean;
    get keys(): Map<string, {
        action: 'add' | 'update' | 'delete';
        oldValue: any;
        newValue: any;
    }>;
    /**
     * @type {Array<{insert?: string | Array<any> | object | AbstractType_<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
     */
    get delta(): Array<{
        insert?: string | Array<any> | object | AbstractType_<any>;
        retain?: number;
        delete?: number;
        attributes?: {
            [s: string]: any;
        };
    }>;
    /**
     * Check if a struct is added by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     */
    adds(struct: __AbstractStruct): boolean;
    get changes(): {
        added: Set<Item>;
        deleted: Set<Item>;
        keys: Map<string, {
            action: 'add' | 'update' | 'delete';
            oldValue: any;
        }>;
        delta: Array<{
            insert?: Array<any> | string;
            delete?: number;
            retain?: number;
        }>;
    };
}
