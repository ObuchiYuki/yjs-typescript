"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMapIterator = exports.typeMapGetSnapshot = exports.typeMapHas = exports.typeMapGetAll = exports.typeMapGet = exports.typeMapSet = exports.typeMapDelete = exports.typeListDelete = exports.typeListPushGenerics = exports.typeListInsertGenerics = exports.typeListInsertGenericsAfter = exports.typeListGet = exports.typeListForEachSnapshot = exports.typeListCreateIterator = exports.typeListMap = exports.typeListForEach = exports.typeListToArraySnapshot = exports.typeListToArray = exports.typeListSlice = exports.AbstractType = exports.callTypeObservers = exports.getTypeChildren = exports.updateMarkerChanges = exports.findMarker = exports.ArraySearchMarker = void 0;
const internals_1 = require("../internals");
const map = require("lib0/map");
const iterator = require("lib0/iterator");
const error = require("lib0/error");
const math = require("lib0/math");
const maxSearchMarker = 80;
/**
 * A unique timestamp that identifies each marker.
 *
 * Time is relative,.. this is more like an ever-increasing clock.
 */
let globalSearchMarkerTimestamp = 0;
class ArraySearchMarker {
    constructor(p, index) {
        this.p = p;
        this.index = index;
        p.marker = true;
        this.timestamp = globalSearchMarkerTimestamp++;
    }
}
exports.ArraySearchMarker = ArraySearchMarker;
const refreshMarkerTimestamp = (marker) => {
    marker.timestamp = globalSearchMarkerTimestamp++;
};
/**
 * This is rather complex so this function is the only thing that should overwrite a marker
 */
const overwriteMarker = (marker, p, index) => {
    marker.p.marker = false;
    marker.p = p;
    p.marker = true;
    marker.index = index;
    marker.timestamp = globalSearchMarkerTimestamp++;
};
const markPosition = (searchMarker, p, index) => {
    if (searchMarker.length >= maxSearchMarker) {
        // override oldest marker (we don't want to create more objects)
        const marker = searchMarker.reduce((a, b) => a.timestamp < b.timestamp ? a : b);
        overwriteMarker(marker, p, index);
        return marker;
    }
    else {
        // create new marker
        const pm = new ArraySearchMarker(p, index);
        searchMarker.push(pm);
        return pm;
    }
};
/**
 * Search marker help us to find positions in the associative array faster.
 *
 * They speed up the process of finding a position without much bookkeeping.
 *
 * A maximum of `maxSearchMarker` objects are created.
 *
 * This function always returns a refreshed marker (updated timestamp)
 */
const findMarker = (yarray, index) => {
    if (yarray._start === null || index === 0 || yarray._searchMarker === null) {
        return null;
    }
    const marker = yarray._searchMarker.length === 0 ? null : yarray._searchMarker.reduce((a, b) => math.abs(index - a.index) < math.abs(index - b.index) ? a : b);
    let p = yarray._start;
    let pindex = 0;
    if (marker !== null) {
        p = marker.p;
        pindex = marker.index;
        refreshMarkerTimestamp(marker); // we used it, we might need to use it again
    }
    // iterate to right if possible
    while (p.right !== null && pindex < index) {
        if (!p.deleted && p.countable) {
            if (index < pindex + p.length) {
                break;
            }
            pindex += p.length;
        }
        p = p.right;
    }
    // iterate to left if necessary (might be that pindex > index)
    while (p.left !== null && pindex > index) {
        p = p.left;
        if (!p.deleted && p.countable) {
            pindex -= p.length;
        }
    }
    // we want to make sure that p can't be merged with left, because that would screw up everything
    // in that cas just return what we have (it is most likely the best marker anyway)
    // iterate to left until p can't be merged with left
    while (p.left !== null && p.left.id.client === p.id.client && p.left.id.clock + p.left.length === p.id.clock) {
        p = p.left;
        if (!p.deleted && p.countable) {
            pindex -= p.length;
        }
    }
    // @todo remove!
    // assure position
    // {
    //     let start = yarray._start
    //     let pos = 0
    //     while (start !== p) {
    //         if (!start.deleted && start.countable) {
    //             pos += start.length
    //         }
    //         start = /** @type {Item} */ (start.right)
    //     }
    //     if (pos !== pindex) {
    //         debugger
    //         throw new Error('Gotcha position fail!')
    //     }
    // }
    // if (marker) {
    //     if (window.lengthes == null) {
    //         window.lengthes = []
    //         window.getLengthes = () => window.lengthes.sort((a, b) => a - b)
    //     }
    //     window.lengthes.push(marker.index - pindex)
    //     console.log('distance', marker.index - pindex, 'len', p && p.parent.length)
    // }
    if (marker !== null && math.abs(marker.index - pindex) < p.parent.length / maxSearchMarker) {
        // adjust existing marker
        overwriteMarker(marker, p, pindex);
        return marker;
    }
    else {
        // create new marker
        return markPosition(yarray._searchMarker, p, pindex);
    }
};
exports.findMarker = findMarker;
/**
 * Update markers when a change happened.
 *
 * This should be called before doing a deletion!
 */
const updateMarkerChanges = (searchMarker, index, len) => {
    for (let i = searchMarker.length - 1; i >= 0; i--) {
        const m = searchMarker[i];
        if (len > 0) {
            let p = m.p;
            p.marker = false;
            // Ideally we just want to do a simple position comparison, but this will only work if
            // search markers don't point to deleted items for formats.
            // Iterate marker to prev undeleted countable position so we know what to do when updating a position
            while (p && (p.deleted || !p.countable)) {
                p = p.left;
                if (p && !p.deleted && p.countable) {
                    // adjust position. the loop should break now
                    m.index -= p.length;
                }
            }
            if (p === null || p.marker === true) {
                // remove search marker if updated position is null or if position is already marked
                searchMarker.splice(i, 1);
                continue;
            }
            m.p = p;
            p.marker = true;
        }
        if (index < m.index || (len > 0 && index === m.index)) { // a simple index <= m.index check would actually suffice
            m.index = math.max(index, m.index + len);
        }
    }
};
exports.updateMarkerChanges = updateMarkerChanges;
/**
 * Accumulate all (list) children of a type and return them as an Array.
 */
const getTypeChildren = (t) => {
    let s = t._start;
    const arr = [];
    while (s) {
        arr.push(s);
        s = s.right;
    }
    return arr;
};
exports.getTypeChildren = getTypeChildren;
/**
 * Call event listeners with an event. This will also add an event to all
 * parents (for `.observeDeep` handlers).
 */
const callTypeObservers = (type, transaction, event) => {
    const changedType = type;
    const changedParentTypes = transaction.changedParentTypes;
    while (true) {
        // @ts-ignore
        map.setIfUndefined(changedParentTypes, type, () => []).push(event);
        if (type._item === null) {
            break;
        }
        type = type._item.parent;
    }
    (0, internals_1.callEventHandlerListeners)(changedType._eH, event, transaction);
};
exports.callTypeObservers = callTypeObservers;
/**
 * Abstract Yjs Type class
 */
class AbstractType {
    constructor() {
        this.doc = null;
        this._item = null;
        this._map = new Map();
        this._start = null;
        this._length = 0;
        /** Event handlers */
        this._eH = (0, internals_1.createEventHandler)();
        /** Deep event handlers */
        this._dEH = (0, internals_1.createEventHandler)();
        this._searchMarker = null;
    }
    get parent() {
        return this._item ? this._item.parent : null;
    }
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y, item) {
        this.doc = y;
        this._item = item;
    }
    _copy() { throw error.methodUnimplemented(); }
    clone() { throw error.methodUnimplemented(); }
    _write(_encoder) { }
    /** The first non-deleted item */
    get _first() {
        let n = this._start;
        while (n !== null && n.deleted) {
            n = n.right;
        }
        return n;
    }
    /**
     * Creates YEvent and calls all type observers.
     * Must be implemented by each type.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction, _parentSubs) {
        if (!transaction.local && this._searchMarker) {
            this._searchMarker.length = 0;
        }
    }
    /** Observe all events that are created on this type. */
    observe(f) {
        (0, internals_1.addEventHandlerListener)(this._eH, f);
    }
    /** Observe all events that are created by this type and its children. */
    observeDeep(f) {
        (0, internals_1.addEventHandlerListener)(this._dEH, f);
    }
    /** Unregister an observer function. */
    unobserve(f) {
        (0, internals_1.removeEventHandlerListener)(this._eH, f);
    }
    /** Unregister an observer function. */
    unobserveDeep(f) {
        (0, internals_1.removeEventHandlerListener)(this._dEH, f);
    }
    toJSON() { }
}
exports.AbstractType = AbstractType;
const typeListSlice = (type, start, end) => {
    if (start < 0) {
        start = type._length + start;
    }
    if (end < 0) {
        end = type._length + end;
    }
    let len = end - start;
    const cs = [];
    let n = type._start;
    while (n !== null && len > 0) {
        if (n.countable && !n.deleted) {
            const c = n.content.getContent();
            if (c.length <= start) {
                start -= c.length;
            }
            else {
                for (let i = start; i < c.length && len > 0; i++) {
                    cs.push(c[i]);
                    len--;
                }
                start = 0;
            }
        }
        n = n.right;
    }
    return cs;
};
exports.typeListSlice = typeListSlice;
const typeListToArray = (type) => {
    const cs = [];
    let n = type._start;
    while (n !== null) {
        if (n.countable && !n.deleted) {
            const c = n.content.getContent();
            for (let i = 0; i < c.length; i++) {
                cs.push(c[i]);
            }
        }
        n = n.right;
    }
    return cs;
};
exports.typeListToArray = typeListToArray;
const typeListToArraySnapshot = (type, snapshot) => {
    const cs = [];
    let n = type._start;
    while (n !== null) {
        if (n.countable && (0, internals_1.isVisible)(n, snapshot)) {
            const c = n.content.getContent();
            for (let i = 0; i < c.length; i++) {
                cs.push(c[i]);
            }
        }
        n = n.right;
    }
    return cs;
};
exports.typeListToArraySnapshot = typeListToArraySnapshot;
/**
 * Executes a provided function on once on overy element of this YArray.
 *
 * @param {AbstractType<any>} type
 * @param {function(any,number,any):void} f A function to execute on every element of this YArray.
 */
const typeListForEach = (type, f) => {
    let index = 0;
    let n = type._start;
    while (n !== null) {
        if (n.countable && !n.deleted) {
            const c = n.content.getContent();
            for (let i = 0; i < c.length; i++) {
                f(c[i], index++, type);
            }
        }
        n = n.right;
    }
};
exports.typeListForEach = typeListForEach;
const typeListMap = (type, f) => {
    const result = [];
    (0, exports.typeListForEach)(type, (c, i) => {
        result.push(f(c, i, type));
    });
    return result;
};
exports.typeListMap = typeListMap;
const typeListCreateIterator = (type) => {
    let n = type._start;
    let currentContent = null;
    let currentContentIndex = 0;
    return {
        [Symbol.iterator]() {
            return this;
        },
        next: () => {
            // find some content
            if (currentContent === null) {
                while (n !== null && n.deleted) {
                    n = n.right;
                }
                // check if we reached the end, no need to check currentContent, because it does not exist
                if (n === null) {
                    return {
                        done: true,
                        value: undefined
                    };
                }
                // we found n, so we can set currentContent
                currentContent = n.content.getContent();
                currentContentIndex = 0;
                n = n.right; // we used the content of n, now iterate to next
            }
            const value = currentContent[currentContentIndex++];
            // check if we need to empty currentContent
            if (currentContent.length <= currentContentIndex) {
                currentContent = null;
            }
            return {
                done: false,
                value
            };
        }
    };
};
exports.typeListCreateIterator = typeListCreateIterator;
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
const typeListForEachSnapshot = (type, f, snapshot) => {
    let index = 0;
    let n = type._start;
    while (n !== null) {
        if (n.countable && (0, internals_1.isVisible)(n, snapshot)) {
            const c = n.content.getContent();
            for (let i = 0; i < c.length; i++) {
                f(c[i], index++, type);
            }
        }
        n = n.right;
    }
};
exports.typeListForEachSnapshot = typeListForEachSnapshot;
const typeListGet = (type, index) => {
    const marker = (0, exports.findMarker)(type, index);
    let n = type._start;
    if (marker !== null) {
        n = marker.p;
        index -= marker.index;
    }
    for (; n !== null; n = n.right) {
        if (!n.deleted && n.countable) {
            if (index < n.length) {
                return n.content.getContent()[index];
            }
            index -= n.length;
        }
    }
};
exports.typeListGet = typeListGet;
const typeListInsertGenericsAfter = (transaction, parent, referenceItem, content) => {
    let left = referenceItem;
    const doc = transaction.doc;
    const ownClientId = doc.clientID;
    const store = doc.store;
    const right = referenceItem === null ? parent._start : referenceItem.right;
    let jsonContent = [];
    const packJsonContent = () => {
        if (jsonContent.length > 0) {
            left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new internals_1.ContentAny(jsonContent));
            left.integrate(transaction, 0);
            jsonContent = [];
        }
    };
    content.forEach(c => {
        if (c === null) {
            jsonContent.push(c);
        }
        else {
            switch (c.constructor) {
                case Number:
                case Object:
                case Boolean:
                case Array:
                case String:
                    jsonContent.push(c);
                    break;
                default:
                    packJsonContent();
                    switch (c.constructor) {
                        case Uint8Array:
                        case ArrayBuffer:
                            left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new internals_1.ContentBinary(new Uint8Array(c)));
                            left.integrate(transaction, 0);
                            break;
                        case internals_1.Doc:
                            left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new internals_1.ContentDoc(c));
                            left.integrate(transaction, 0);
                            break;
                        default:
                            if (c instanceof AbstractType) {
                                left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new internals_1.ContentType(c));
                                left.integrate(transaction, 0);
                            }
                            else {
                                throw new Error('Unexpected content type in insert operation');
                            }
                    }
            }
        }
    });
    packJsonContent();
};
exports.typeListInsertGenericsAfter = typeListInsertGenericsAfter;
const lengthExceeded = error.create('Length exceeded!');
const typeListInsertGenerics = (transaction, parent, index, content) => {
    if (index > parent._length) {
        throw lengthExceeded;
    }
    if (index === 0) {
        if (parent._searchMarker) {
            (0, exports.updateMarkerChanges)(parent._searchMarker, index, content.length);
        }
        return (0, exports.typeListInsertGenericsAfter)(transaction, parent, null, content);
    }
    const startIndex = index;
    const marker = (0, exports.findMarker)(parent, index);
    let n = parent._start;
    if (marker !== null) {
        n = marker.p;
        index -= marker.index;
        // we need to iterate one to the left so that the algorithm works
        if (index === 0) {
            // @todo refactor this as it actually doesn't consider formats
            n = n.prev; // important! get the left undeleted item so that we can actually decrease index
            index += (n && n.countable && !n.deleted) ? n.length : 0;
        }
    }
    for (; n !== null; n = n.right) {
        if (!n.deleted && n.countable) {
            if (index <= n.length) {
                if (index < n.length) {
                    // insert in-between
                    (0, internals_1.getItemCleanStart)(transaction, (0, internals_1.createID)(n.id.client, n.id.clock + index));
                }
                break;
            }
            index -= n.length;
        }
    }
    if (parent._searchMarker) {
        (0, exports.updateMarkerChanges)(parent._searchMarker, startIndex, content.length);
    }
    return (0, exports.typeListInsertGenericsAfter)(transaction, parent, n, content);
};
exports.typeListInsertGenerics = typeListInsertGenerics;
/**
 * Pushing content is special as we generally want to push after the last item. So we don't have to update
 * the serach marker.
*/
const typeListPushGenerics = (transaction, parent, content) => {
    // Use the marker with the highest index and iterate to the right.
    const marker = (parent._searchMarker || []).reduce((maxMarker, currMarker) => currMarker.index > maxMarker.index ? currMarker : maxMarker, { index: 0, p: parent._start });
    let n = marker.p;
    if (n) {
        while (n.right) {
            n = n.right;
        }
    }
    return (0, exports.typeListInsertGenericsAfter)(transaction, parent, n, content);
};
exports.typeListPushGenerics = typeListPushGenerics;
const typeListDelete = (transaction, parent, index, length) => {
    if (length === 0) {
        return;
    }
    const startIndex = index;
    const startLength = length;
    const marker = (0, exports.findMarker)(parent, index);
    let n = parent._start;
    if (marker !== null) {
        n = marker.p;
        index -= marker.index;
    }
    // compute the first item to be deleted
    for (; n !== null && index > 0; n = n.right) {
        if (!n.deleted && n.countable) {
            if (index < n.length) {
                (0, internals_1.getItemCleanStart)(transaction, (0, internals_1.createID)(n.id.client, n.id.clock + index));
            }
            index -= n.length;
        }
    }
    // delete all items until done
    while (length > 0 && n !== null) {
        if (!n.deleted) {
            if (length < n.length) {
                (0, internals_1.getItemCleanStart)(transaction, (0, internals_1.createID)(n.id.client, n.id.clock + length));
            }
            n.delete(transaction);
            length -= n.length;
        }
        n = n.right;
    }
    if (length > 0) {
        throw lengthExceeded;
    }
    if (parent._searchMarker) {
        (0, exports.updateMarkerChanges)(parent._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */);
    }
};
exports.typeListDelete = typeListDelete;
const typeMapDelete = (transaction, parent, key) => {
    const c = parent._map.get(key);
    if (c !== undefined) {
        c.delete(transaction);
    }
};
exports.typeMapDelete = typeMapDelete;
const typeMapSet = (transaction, parent, key, value) => {
    const left = parent._map.get(key) || null;
    const doc = transaction.doc;
    const ownClientId = doc.clientID;
    let content;
    if (value == null) {
        content = new internals_1.ContentAny([value]);
    }
    else {
        switch (value.constructor) {
            case Number:
            case Object:
            case Boolean:
            case Array:
            case String:
                content = new internals_1.ContentAny([value]);
                break;
            case Uint8Array:
                content = new internals_1.ContentBinary(value);
                break;
            case internals_1.Doc:
                content = new internals_1.ContentDoc(value);
                break;
            default:
                if (value instanceof AbstractType) {
                    content = new internals_1.ContentType(value);
                }
                else {
                    throw new Error('Unexpected content type');
                }
        }
    }
    new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(doc.store, ownClientId)), left, left && left.lastId, null, null, parent, key, content).integrate(transaction, 0);
};
exports.typeMapSet = typeMapSet;
const typeMapGet = (parent, key) => {
    const val = parent._map.get(key);
    return val !== undefined && !val.deleted ? val.content.getContent()[val.length - 1] : undefined;
};
exports.typeMapGet = typeMapGet;
const typeMapGetAll = (parent) => {
    const res = {};
    parent._map.forEach((value, key) => {
        if (!value.deleted) {
            res[key] = value.content.getContent()[value.length - 1];
        }
    });
    return res;
};
exports.typeMapGetAll = typeMapGetAll;
const typeMapHas = (parent, key) => {
    const val = parent._map.get(key);
    return val !== undefined && !val.deleted;
};
exports.typeMapHas = typeMapHas;
const typeMapGetSnapshot = (parent, key, snapshot) => {
    let v = parent._map.get(key) || null;
    while (v !== null && (!snapshot.sv.has(v.id.client) || v.id.clock >= (snapshot.sv.get(v.id.client) || 0))) {
        v = v.left;
    }
    return v !== null && (0, internals_1.isVisible)(v, snapshot) ? v.content.getContent()[v.length - 1] : undefined;
};
exports.typeMapGetSnapshot = typeMapGetSnapshot;
const createMapIterator = (map) => {
    return iterator.iteratorFilter(map.entries(), (entry) => !entry[1].deleted);
};
exports.createMapIterator = createMapIterator;
