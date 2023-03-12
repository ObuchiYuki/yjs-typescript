import { GC, Transaction, ID, Item } from '../internals';
export declare class StructStore {
    clients: Map<number, Array<GC | Item>>;
    pendingStructs: null | {
        missing: Map<number, number>;
        update: Uint8Array;
    };
    pendingDs: null | Uint8Array;
    constructor();
}
/**
 * Return the states as a Map<client,clock>.
 * Note that clock refers to the next expected clock id.
 *
 * @param {StructStore} store
 * @return {Map<number,number>}
 *
 * @public
 * @function
 */
export declare const getStateVector: (store: StructStore) => Map<number, number>;
/**
 * @param {StructStore} store
 * @param {number} client
 * @return {number}
 *
 * @public
 * @function
 */
export declare const getState: (store: StructStore, client: number) => number;
/**
 * @param {StructStore} store
 *
 * @private
 * @function
 */
export declare const integretyCheck: (store: StructStore) => void;
/**
 * @param {StructStore} store
 * @param {GC|Item} struct
 *
 * @private
 * @function
 */
export declare const addStruct: (store: StructStore, struct: GC | Item) => void;
/**
 * Perform a binary search on a sorted array
 * @param {Array<Item|GC>} structs
 * @param {number} clock
 * @return {number}
 *
 * @private
 * @function
 */
export declare const findIndexSS: (structs: Array<Item | GC>, clock: number) => number;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 *
 * @param {StructStore} store
 * @param {ID} id
 * @return {GC|Item}
 *
 * @private
 * @function
 */
export declare const find: (store: StructStore, id: ID) => GC | Item;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 * @private
 * @function
 */
export declare const getItem: (store: StructStore, id: ID) => Item;
/**
 * @param {Transaction} transaction
 * @param {Array<Item|GC>} structs
 * @param {number} clock
 */
export declare const findIndexCleanStart: (transaction: Transaction, structs: Array<Item | GC>, clock: number) => number;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 *
 * @param {Transaction} transaction
 * @param {ID} id
 * @return {Item}
 *
 * @private
 * @function
 */
export declare const getItemCleanStart: (transaction: Transaction, id: ID) => Item;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 *
 * @param {Transaction} transaction
 * @param {StructStore} store
 * @param {ID} id
 * @return {Item}
 *
 * @private
 * @function
 */
export declare const getItemCleanEnd: (transaction: Transaction, store: StructStore, id: ID) => Item;
/**
 * Replace `item` with `newitem` in store
 * @param {StructStore} store
 * @param {GC|Item} struct
 * @param {GC|Item} newStruct
 *
 * @private
 * @function
 */
export declare const replaceStruct: (store: StructStore, struct: GC | Item, newStruct: GC | Item) => void;
/**
 * Iterate over a range of structs
 *
 * @param {Transaction} transaction
 * @param {Array<Item|GC>} structs
 * @param {number} clockStart Inclusive start
 * @param {number} len
 * @param {function(GC|Item):void} f
 *
 * @function
 */
export declare const iterateStructs: (transaction: Transaction, structs: Array<Item | GC>, clockStart: number, len: number, f: (arg0: GC | Item) => void) => void;
