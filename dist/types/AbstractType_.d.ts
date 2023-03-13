import { Doc, Transaction, EventHandler, YEvent, Item, UpdateEncoderAny_, ArraySearchMarker_, Snapshot } from '../internals';
export type Contentable_ = object | Contentable_[] | boolean | number | null | string | Uint8Array;
export declare abstract class AbstractType_<EventType> {
    doc: Doc | null;
    get parent(): AbstractType_<any> | null;
    _item: Item | null;
    _map: Map<string, Item>;
    _start: Item | null;
    _length: number;
    _eH: EventHandler<EventType, Transaction>; /** Event handlers */
    _dEH: EventHandler<Array<YEvent<any>>, Transaction>; /** Deep event handlers */
    _searchMarker: null | Array<ArraySearchMarker_>;
    /** The first non-deleted item */
    get _first(): Item | null;
    abstract clone(): AbstractType_<EventType>;
    abstract _copy(): AbstractType_<EventType>;
    constructor();
    /** Accumulate all (list) children of a type and return them as an Array. */
    getChildren(): Item[];
    /** Call event listeners with an event. This will also add an event to all parents (for `.observeDeep` handlers). */
    callObservers<EventType extends YEvent<any>>(this: AbstractType_<any>, transaction: Transaction, event: EventType): void;
    listSlice(start: number, end: number): any[];
    listToArray(): any[];
    listToArraySnapshot(snapshot: Snapshot): any[];
    /** Executes a provided function on once on overy element of this YArray. */
    listForEach(body: (element: any, index: number, parent: this) => void): void;
    listMap<C, R>(body: (element: C, index: number, type: this) => R): R[];
    listCreateIterator(): IterableIterator<any>;
    /**
     * Executes a provided function on once on overy element of this YArray.
     * Operates on a snapshotted state of the document.
     */
    listForEachSnapshot(body: (element: any, index: number, type: this) => void, snapshot: Snapshot): void;
    listGet(index: number): any;
    listInsertGenericsAfter(transaction: Transaction, referenceItem: Item | null, contents: Contentable_[]): void;
    listInsertGenerics: (transaction: Transaction, index: number, contents: Contentable_[]) => void;
    /**
     * this -> parent
     *
     * Pushing content is special as we generally want to push after the last item. So we don't have to update
     * the serach marker.
    */
    listPushGenerics(transaction: Transaction, contents: Contentable_[]): void;
    /** this -> parent */
    listDelete(transaction: Transaction, index: number, length: number): void;
    mapDelete(transaction: Transaction, key: string): void;
    mapSet(transaction: Transaction, key: string, value: Contentable_): void;
    mapGet(key: string): Contentable_;
    mapGetAll(): {
        [s: string]: Contentable_;
    };
    mapHas(key: string): boolean;
    mapGetSnapshot(key: string, snapshot: Snapshot): Contentable_;
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item | null): void;
    _write(_encoder: UpdateEncoderAny_): void;
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
