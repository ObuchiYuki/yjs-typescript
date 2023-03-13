import { Snapshot, Transaction, Item, // eslint-disable-line
AbstractType_ } from '../internals';
export declare class ArraySearchMarker {
    p: Item;
    index: number;
    timestamp: number;
    constructor(p: Item, index: number);
}
/**
 * Search marker help us to find positions in the associative array faster.
 *
 * They speed up the process of finding a position without much bookkeeping.
 *
 * A maximum of `maxSearchMarker` objects are created.
 *
 * This function always returns a refreshed marker (updated timestamp)
 */
export declare const findMarker: (yarray: AbstractType_<any>, index: number) => ArraySearchMarker | null;
/**
 * Update markers when a change happened.
 *
 * This should be called before doing a deletion!
 */
export declare const updateMarkerChanges: (searchMarker: ArraySearchMarker[], index: number, len: number) => void;
/**
 * Accumulate all (list) children of a type and return them as an Array.
 */
export declare const getTypeChildren: (t: AbstractType_<any>) => Item[];
/**
 * Call event listeners with an event. This will also add an event to all
 * parents (for `.observeDeep` handlers).
 */
export declare const callTypeObservers: <EventType>(type: AbstractType_<EventType>, transaction: Transaction, event: EventType) => void;
/**
 * Abstract Yjs Type class
 */
export declare const typeListSlice: (type: AbstractType_<any>, start: number, end: number) => any[];
export declare const typeListToArray: (type: AbstractType_<any>) => any[];
export declare const typeListToArraySnapshot: (type: AbstractType_<any>, snapshot: Snapshot) => any[];
/**
 * Executes a provided function on once on overy element of this YArray.
 *
 * @param {AbstractType_<any>} type
 * @param {function(any,number,any):void} f A function to execute on every element of this YArray.
 */
export declare const typeListForEach: (type: AbstractType_<any>, f: (element: any, index: number, parent: any) => void) => void;
export declare const typeListMap: <C, R>(type: AbstractType_<any>, f: (element: C, index: number, type: AbstractType_<any>) => R) => R[];
export declare const typeListCreateIterator: (type: AbstractType_<any>) => IterableIterator<any>;
/**
 * Executes a provided function on once on overy element of this YArray.
 * Operates on a snapshotted state of the document.
 *
 * @param {AbstractType_<any>} type
 * @param {function(any,number,AbstractType_<any>):void} f A function to execute on every element of this YArray.
 * @param {Snapshot} snapshot
 *
 * @private
 * @function
 */
export declare const typeListForEachSnapshot: (type: AbstractType_<any>, f: (element: any, index: number, type: AbstractType_<any>) => void, snapshot: Snapshot) => void;
export declare const typeListGet: (type: AbstractType_<any>, index: number) => any;
export declare const typeListInsertGenericsAfter: (transaction: Transaction, parent: AbstractType_<any>, referenceItem: Item | null, content: (object | Array<any> | boolean | number | null | string | Uint8Array)[]) => void;
export declare const typeListInsertGenerics: (transaction: Transaction, parent: AbstractType_<any>, index: number, content: (string | number | any[] | Uint8Array | {
    [s: string]: any;
} | null)[]) => void;
/**
 * Pushing content is special as we generally want to push after the last item. So we don't have to update
 * the serach marker.
*/
export declare const typeListPushGenerics: (transaction: Transaction, parent: AbstractType_<any>, content: (string | number | any[] | Uint8Array | {
    [s: string]: any;
} | null)[]) => void;
export declare const typeListDelete: (transaction: Transaction, parent: AbstractType_<any>, index: number, length: number) => void;
export declare const typeMapDelete: (transaction: Transaction, parent: AbstractType_<any>, key: string) => void;
export declare const typeMapSet: (transaction: Transaction, parent: AbstractType_<any>, key: string, value: object | number | null | Array<any> | string | Uint8Array | AbstractType_<any>) => void;
export declare const typeMapGet: (parent: AbstractType_<any>, key: string) => string | number | any[] | Uint8Array | AbstractType_<any> | {
    [s: string]: any;
} | null | undefined;
export declare const typeMapGetAll: (parent: AbstractType_<any>) => {
    [s: string]: string | number | any[] | Uint8Array | AbstractType_<any> | {
        [s: string]: any;
    } | null | undefined;
};
export declare const typeMapHas: (parent: AbstractType_<any>, key: string) => boolean;
export declare const typeMapGetSnapshot: (parent: AbstractType_<any>, key: string, snapshot: Snapshot) => string | number | any[] | Uint8Array | AbstractType_<any> | {
    [s: string]: any;
} | null | undefined;
export declare const createMapIterator: (map: Map<string, Item>) => IterableIterator<any[]>;
