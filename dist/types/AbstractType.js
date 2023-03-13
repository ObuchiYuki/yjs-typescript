"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMapIterator = exports.typeMapGetSnapshot = exports.typeMapHas = exports.typeMapGetAll = exports.typeMapGet = exports.typeMapSet = exports.typeMapDelete = exports.typeListDelete = exports.typeListPushGenerics = exports.typeListInsertGenerics = exports.typeListInsertGenericsAfter = exports.typeListGet = exports.typeListForEachSnapshot = exports.typeListCreateIterator = exports.typeListMap = exports.typeListForEach = exports.typeListToArraySnapshot = exports.typeListToArray = exports.typeListSlice = exports.callTypeObservers = exports.getTypeChildren = void 0;
const internals_1 = require("../internals");
const map = require("lib0/map");
const iterator = require("lib0/iterator");
const error = require("lib0/error");
__exportStar(require("./ArraySearchMarker"), exports); // temporally
const ArraySearchMarker_1 = require("./ArraySearchMarker"); // temporally here
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
 * @param {AbstractType_<any>} type
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
 * @param {AbstractType_<any>} type
 * @param {function(any,number,AbstractType_<any>):void} f A function to execute on every element of this YArray.
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
    const marker = ArraySearchMarker_1.ArraySearchMarker.find(type, index);
    let item = type._start;
    if (marker != null) {
        item = marker.item;
        index -= marker.index;
    }
    for (; item !== null; item = item.right) {
        if (!item.deleted && item.countable) {
            if (index < item.length) {
                return item.content.getContent()[index];
            }
            index -= item.length;
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
            left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new internals_1.ContentAny(jsonContent));
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
                            left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new internals_1.ContentBinary(new Uint8Array(c)));
                            left.integrate(transaction, 0);
                            break;
                        case internals_1.Doc:
                            left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new internals_1.ContentDoc(c));
                            left.integrate(transaction, 0);
                            break;
                        default:
                            if (c instanceof internals_1.AbstractType_) {
                                left = new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new internals_1.ContentType(c));
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
            ArraySearchMarker_1.ArraySearchMarker.updateChanges(parent._searchMarker, index, content.length);
        }
        return (0, exports.typeListInsertGenericsAfter)(transaction, parent, null, content);
    }
    const startIndex = index;
    const marker = ArraySearchMarker_1.ArraySearchMarker.find(parent, index);
    let n = parent._start;
    if (marker != null) {
        n = marker.item;
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
        ArraySearchMarker_1.ArraySearchMarker.updateChanges(parent._searchMarker, startIndex, content.length);
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
    const marker = (parent._searchMarker || [])
        .reduce((maxMarker, currMarker) => {
        return currMarker.index > maxMarker.index ? currMarker : maxMarker;
    }, new ArraySearchMarker_1.ArraySearchMarker(parent._start, 0));
    let item = marker.item;
    while (item === null || item === void 0 ? void 0 : item.right) {
        item = item.right;
    }
    return (0, exports.typeListInsertGenericsAfter)(transaction, parent, item, content);
};
exports.typeListPushGenerics = typeListPushGenerics;
const typeListDelete = (transaction, parent, index, length) => {
    if (length === 0) {
        return;
    }
    const startIndex = index;
    const startLength = length;
    const marker = ArraySearchMarker_1.ArraySearchMarker.find(parent, index);
    let item = parent._start;
    if (marker != null) {
        item = marker.item;
        index -= marker.index;
    }
    // compute the first item to be deleted
    for (; item !== null && index > 0; item = item.right) {
        if (!item.deleted && item.countable) {
            if (index < item.length) {
                (0, internals_1.getItemCleanStart)(transaction, (0, internals_1.createID)(item.id.client, item.id.clock + index));
            }
            index -= item.length;
        }
    }
    // delete all items until done
    while (length > 0 && item !== null) {
        if (!item.deleted) {
            if (length < item.length) {
                (0, internals_1.getItemCleanStart)(transaction, (0, internals_1.createID)(item.id.client, item.id.clock + length));
            }
            item.delete(transaction);
            length -= item.length;
        }
        item = item.right;
    }
    if (length > 0) {
        throw lengthExceeded;
    }
    if (parent._searchMarker) {
        ArraySearchMarker_1.ArraySearchMarker.updateChanges(parent._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */);
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
                if (value instanceof internals_1.AbstractType_) {
                    content = new internals_1.ContentType(value);
                }
                else {
                    throw new Error('Unexpected content type');
                }
        }
    }
    new internals_1.Item((0, internals_1.createID)(ownClientId, (0, internals_1.getState)(doc.store, ownClientId)), left, left && left.lastID, null, null, parent, key, content).integrate(transaction, 0);
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
