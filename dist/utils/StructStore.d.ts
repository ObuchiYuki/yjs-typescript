import { GC, Transaction, ID, Item } from '../internals';
export declare class StructStore {
    clients: Map<number, Array<GC | Item>>;
    pendingStructs: null | {
        missing: Map<number, number>;
        update: Uint8Array;
    };
    pendingDs: null | Uint8Array;
    constructor();
    /** Return the states as a Map<client,clock>. Note that clock refers to the next expected clock id. */
    getStateVector(): Map<number, number>;
    getState(client: number): number;
    integretyCheck(): void;
    addStruct(struct: GC | Item): void;
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    find(id: ID): GC | Item;
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    getItem(id: ID): Item;
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    static getItemCleanStart(transaction: Transaction, id: ID): Item;
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    getItemCleanEnd(transaction: Transaction, id: ID): Item;
    /** Replace `item` with `newitem` in store */
    replaceStruct(struct: GC | Item, newStruct: GC | Item): void;
    /** Iterate over a range of structs */
    static iterateStructs: (transaction: Transaction, structs: Array<Item | GC>, clockStart: number, len: number, f: (arg0: GC | Item) => void) => void;
    /** Perform a binary search on a sorted array */
    static findIndexSS: (structs: Array<Item | GC>, clock: number) => number;
    static findIndexCleanStart: (transaction: Transaction, structs: Array<Item | GC>, clock: number) => number;
}
