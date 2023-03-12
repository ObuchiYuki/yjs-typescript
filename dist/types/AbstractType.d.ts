import { UpdateEncoderV1, UpdateEncoderV2, Doc, Snapshot, Transaction, EventHandler, YEvent, Item } from '../internals';
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
export declare const findMarker: (yarray: AbstractType<any>, index: number) => ArraySearchMarker | null;
/**
 * Update markers when a change happened.
 *
 * This should be called before doing a deletion!
 */
export declare const updateMarkerChanges: (searchMarker: ArraySearchMarker[], index: number, len: number) => void;
/**
 * Accumulate all (list) children of a type and return them as an Array.
 */
export declare const getTypeChildren: (t: AbstractType<any>) => Item[];
/**
 * Call event listeners with an event. This will also add an event to all
 * parents (for `.observeDeep` handlers).
 */
export declare const callTypeObservers: <EventType>(type: AbstractType<EventType>, transaction: Transaction, event: EventType) => void;
/**
 * Abstract Yjs Type class
 */
export declare class AbstractType<EventType> {
    doc: Doc | null;
    _item: Item | null;
    _map: Map<string, Item>;
    _start: Item | null;
    _length: number;
    /** Event handlers */
    _eH: EventHandler<EventType, Transaction>;
    /** Deep event handlers */
    _dEH: EventHandler<Array<YEvent<any>>, Transaction>;
    _searchMarker: null | Array<ArraySearchMarker>;
    constructor();
    get parent(): AbstractType<any> | null;
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item | null): void;
    _copy(): AbstractType<EventType>;
    clone(): AbstractType<EventType>;
    _write(_encoder: UpdateEncoderV1 | UpdateEncoderV2): void;
    /** The first non-deleted item */
    get _first(): Item | null;
    /**
     * Creates YEvent and calls all type observers.
     * Must be implemented by each type.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, _parentSubs: Set<null | string>): void;
    /** Observe all events that are created on this type. */
    observe(f: (type: EventType, transaction: Transaction) => void): void;
    /** Observe all events that are created by this type and its children. */
    observeDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void): void;
    /** Unregister an observer function. */
    unobserve(f: (type: EventType, transaction: Transaction) => void): void;
    /** Unregister an observer function. */
    unobserveDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void): void;
    toJSON(): any;
}
export declare const typeListSlice: (type: AbstractType<any>, start: number, end: number) => any[];
export declare const typeListToArray: (type: AbstractType<any>) => any[];
export declare const typeListToArraySnapshot: (type: AbstractType<any>, snapshot: Snapshot) => any[];
/**
 * Executes a provided function on once on overy element of this YArray.
 *
 * @param {AbstractType<any>} type
 * @param {function(any,number,any):void} f A function to execute on every element of this YArray.
 */
export declare const typeListForEach: (type: AbstractType<any>, f: (element: any, index: number, parent: any) => void) => void;
export declare const typeListMap: <C, R>(type: AbstractType<any>, f: (element: C, index: number, type: AbstractType<any>) => R) => R[];
export declare const typeListCreateIterator: (type: AbstractType<any>) => IterableIterator<any>;
/**
 * Executes a provided function on once on overy element of this YArray.
 * Operates on a snapshotted state of the document.
 *
 * @param {AbstractType<any>} type
 * @param {function(any,number,AbstractType<any>):void} f A function to execute on every element of this YArray.
 * @param {Snapshot} snapshot
 *
 * @private
 * @function
 */
export declare const typeListForEachSnapshot: (type: AbstractType<any>, f: (element: any, index: number, type: AbstractType<any>) => void, snapshot: Snapshot) => void;
export declare const typeListGet: (type: AbstractType<any>, index: number) => any;
export declare const typeListInsertGenericsAfter: (transaction: Transaction, parent: AbstractType<any>, referenceItem: Item | null, content: (object | Array<any> | boolean | number | null | string | Uint8Array)[]) => void;
export declare const typeListInsertGenerics: (transaction: Transaction, parent: AbstractType<any>, index: number, content: (string | number | any[] | Uint8Array | {
    [s: string]: any;
} | null)[]) => void;
/**
 * Pushing content is special as we generally want to push after the last item. So we don't have to update
 * the serach marker.
*/
export declare const typeListPushGenerics: (transaction: Transaction, parent: AbstractType<any>, content: (string | number | any[] | Uint8Array | {
    [s: string]: any;
} | null)[]) => void;
export declare const typeListDelete: (transaction: Transaction, parent: AbstractType<any>, index: number, length: number) => void;
export declare const typeMapDelete: (transaction: Transaction, parent: AbstractType<any>, key: string) => void;
export declare const typeMapSet: (transaction: Transaction, parent: AbstractType<any>, key: string, value: object | number | null | Array<any> | string | Uint8Array | AbstractType<any>) => void;
export declare const typeMapGet: (parent: AbstractType<any>, key: string) => string | number | any[] | Uint8Array | AbstractType<any> | {
    [s: string]: any;
} | null | undefined;
export declare const typeMapGetAll: (parent: AbstractType<any>) => {
    [s: string]: string | number | any[] | Uint8Array | AbstractType<any> | {
        [s: string]: any;
    } | null | undefined;
};
export declare const typeMapHas: (parent: AbstractType<any>, key: string) => boolean;
export declare const typeMapGetSnapshot: (parent: AbstractType<any>, key: string, snapshot: Snapshot) => string | number | any[] | Uint8Array | AbstractType<any> | {
    [s: string]: any;
} | null | undefined;
export declare const createMapIterator: (map: Map<string, Item>) => IterableIterator<any[]>;
