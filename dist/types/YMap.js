"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYMap = exports.YMap = exports.YMapEvent = void 0;
const internals_1 = require("../internals");
const AbstractType_1 = require("./AbstractType_");
const lib0 = require("lib0-typescript");
/** Event that describes the changes on a YMap. */
class YMapEvent extends internals_1.YEvent {
    /**
     * @param {YMap<T>} ymap The YArray that changed.
     * @param {Transaction} transaction
     * @param {Set<any>} subs The keys that changed.
     */
    constructor(ymap, transaction, keysChanged) {
        super(ymap, transaction);
        this.keysChanged = keysChanged;
    }
}
exports.YMapEvent = YMapEvent;
/**
 * @template MapType
 * A shared Map implementation.
 *
 * @extends AbstractType_<YMapEvent<MapType>>
 * @implements {Iterable<MapType>}
 */
class YMap extends AbstractType_1.AbstractType_ {
    /**
     *
     * @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
     */
    constructor(entries = undefined) {
        super();
        this._prelimContent = null;
        if (entries === undefined) {
            this._prelimContent = new Map();
        }
        else {
            this._prelimContent = new Map(entries);
        }
    }
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y, item) {
        super._integrate(y, item);
        this._prelimContent.forEach((value, key) => {
            this.set(key, value);
        });
        this._prelimContent = null;
    }
    _copy() {
        return new YMap();
    }
    clone() {
        const map = new YMap();
        this.forEach((value, key) => {
            map.set(key, value instanceof AbstractType_1.AbstractType_ ? value.clone() : value);
        });
        return map;
    }
    /**
     * Creates YMapEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction, parentSubs) {
        this.callObservers(transaction, new YMapEvent(this, transaction, parentSubs));
    }
    /** Transforms this Shared Type to a JSON object. */
    toJSON() {
        const map = {};
        this._map.forEach((item, key) => {
            if (!item.deleted) {
                const v = item.content.getContent()[item.length - 1];
                map[key] = v instanceof AbstractType_1.AbstractType_ ? v.toJSON() : v;
            }
        });
        return map;
    }
    createMapIterator() {
        return lib0.filterIterator(this._map.entries(), entry => !entry[1].deleted);
    }
    /** Returns the size of the YMap (count of key/value pairs) */
    get size() {
        return [...this.createMapIterator()].length;
    }
    /** Returns the keys for each element in the YMap Type. */
    keys() {
        return lib0.mapIterator(this.createMapIterator(), (v) => v[0]);
    }
    /** Returns the values for each element in the YMap Type. */
    values() {
        return lib0.mapIterator(this.createMapIterator(), (v) => v[1].content.getContent()[v[1].length - 1]);
    }
    /** Returns an Iterator of [key, value] pairs */
    entries() {
        return lib0.mapIterator(this.createMapIterator(), (v) => [v[0], v[1].content.getContent()[v[1].length - 1]]);
    }
    /** Executes a provided function on once on every key-value pair. */
    forEach(f) {
        this._map.forEach((item, key) => {
            if (!item.deleted) {
                f(item.content.getContent()[item.length - 1], key, this);
            }
        });
    }
    /** Returns an Iterator of [key, value] pairs */
    [Symbol.iterator]() {
        return this.entries();
    }
    /** Remove a specified element from this YMap. */
    delete(key) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.mapDelete(transaction, key);
            });
        }
        else {
            this._prelimContent.delete(key);
        }
    }
    /** Adds or updates an element with a specified key and value. */
    set(key, value) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.mapSet(transaction, key, value);
            });
        }
        else {
            this._prelimContent.set(key, value);
        }
        return value;
    }
    /** Returns a specified element from this YMap. */
    get(key) {
        return this.mapGet(key);
    }
    /** Returns a boolean indicating whether the specified key exists or not. */
    has(key) {
        return this.mapHas(key);
    }
    /** Removes all elements from this YMap. */
    clear() {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.forEach(function (_value, key, map) {
                    map.mapDelete(transaction, key);
                });
            });
        }
        else {
            this._prelimContent.clear();
        }
    }
    _write(encoder) {
        encoder.writeTypeRef(internals_1.YMapRefID);
    }
}
exports.YMap = YMap;
const readYMap = (_decoder) => {
    return new YMap();
};
exports.readYMap = readYMap;
