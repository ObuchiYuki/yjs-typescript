/**
 * @module YMap
 */
import { YEvent, Doc, Transaction, Item, UpdateEncoderAny_, UpdateDecoderAny_ } from '../internals';
import { AbstractType_ } from "./AbstractType_";
/** Event that describes the changes on a YMap. */
export declare class YMapEvent<T> extends YEvent<YMap<T>> {
    keysChanged: Set<any>;
    /**
     * @param {YMap<T>} ymap The YArray that changed.
     * @param {Transaction} transaction
     * @param {Set<any>} subs The keys that changed.
     */
    constructor(ymap: YMap<T>, transaction: Transaction, subs: Set<any>);
}
/**
 * @template MapType
 * A shared Map implementation.
 *
 * @extends AbstractType_<YMapEvent<MapType>>
 * @implements {Iterable<MapType>}
 */
export declare class YMap<MapType> extends AbstractType_<YMapEvent<MapType>> implements Iterable<MapType> {
    _prelimContent: Map<string, any> | null;
    /**
     *
     * @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
     */
    constructor(entries?: Iterable<readonly [string, any]> | undefined);
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item): void;
    _copy(): YMap<MapType>;
    clone(): YMap<MapType>;
    /**
     * Creates YMapEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>): void;
    /** Transforms this Shared Type to a JSON object. */
    toJSON(): {
        [s: string]: any;
    };
    /** Returns the size of the YMap (count of key/value pairs) */
    get size(): number;
    /** Returns the keys for each element in the YMap Type. */
    keys(): IterableIterator<string>;
    /** Returns the values for each element in the YMap Type. */
    values(): IterableIterator<any>;
    /** Returns an Iterator of [key, value] pairs */
    entries(): IterableIterator<any>;
    /** Executes a provided function on once on every key-value pair. */
    forEach(f: (element: MapType, key: string, map: YMap<MapType>) => void): void;
    /** Returns an Iterator of [key, value] pairs */
    [Symbol.iterator](): IterableIterator<any>;
    /** Remove a specified element from this YMap. */
    delete(key: string): void;
    /** Adds or updates an element with a specified key and value. */
    set(key: string, value: MapType): MapType;
    /** Returns a specified element from this YMap. */
    get(key: string): MapType | undefined;
    /** Returns a boolean indicating whether the specified key exists or not. */
    has(key: string): boolean;
    /** Removes all elements from this YMap. */
    clear(): void;
    _write(encoder: UpdateEncoderAny_): void;
}
export declare const readYMap: (_decoder: UpdateDecoderAny_) => YMap<unknown>;
