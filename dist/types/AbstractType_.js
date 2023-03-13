"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractType_ = void 0;
const map = require("lib0/map");
const internals_1 = require("../internals");
class AbstractType_ {
    get parent() {
        return this._item ? this._item.parent : null;
    }
    /** The first non-deleted item */
    get _first() {
        let n = this._start;
        while (n !== null && n.deleted) {
            n = n.right;
        }
        return n;
    }
    // ================================================================================================================ //
    // MARK: - Methods -
    constructor() {
        // ================================================================================================================ //
        // MARK: - Property -
        this.doc = null;
        // ================================================================================================================ //
        // MARK: - Private (Temporally public) -
        this._item = null;
        this._map = new Map();
        this._start = null;
        this._length = 0;
        this._eH = (0, internals_1.createEventHandler)(); /** Event handlers */
        this._dEH = (0, internals_1.createEventHandler)(); /** Deep event handlers */
        this._searchMarker = null;
        // this -> parent
        this.listInsertGenerics = (transaction, index, contents) => {
            if (index > this._length) {
                throw new Error('Length exceeded!');
            }
            if (index === 0) {
                if (this._searchMarker) {
                    internals_1.ArraySearchMarker_.updateChanges(this._searchMarker, index, contents.length);
                }
                return this.listInsertGenericsAfter(transaction, null, contents);
            }
            const startIndex = index;
            const marker = internals_1.ArraySearchMarker_.find(this, index);
            let n = this._start;
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
            if (this._searchMarker) {
                internals_1.ArraySearchMarker_.updateChanges(this._searchMarker, startIndex, contents.length);
            }
            return this.listInsertGenericsAfter(transaction, n, contents);
        };
    }
    /** Accumulate all (list) children of a type and return them as an Array. */
    getChildren() {
        let item = this._start;
        const arr = [];
        while (item != null) {
            arr.push(item);
            item = item.right;
        }
        return arr;
    }
    /** Call event listeners with an event. This will also add an event to all parents (for `.observeDeep` handlers). */
    callObservers(transaction, event) {
        let type = this;
        const changedType = type;
        const changedParentTypes = transaction.changedParentTypes;
        while (true) {
            map.setIfUndefined(changedParentTypes, type, () => [])
                .push(event);
            if (type._item === null) {
                break;
            }
            type = type._item.parent;
        }
        (0, internals_1.callEventHandlerListeners)(changedType._eH, event, transaction);
    }
    listSlice(start, end) {
        if (start < 0) {
            start = this._length + start;
        }
        if (end < 0) {
            end = this._length + end;
        }
        let len = end - start;
        const cs = [];
        let n = this._start;
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
    }
    listToArray() {
        const cs = [];
        let n = this._start;
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
    }
    listToArraySnapshot(snapshot) {
        const cs = [];
        let n = this._start;
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
    }
    /** Executes a provided function on once on overy element of this YArray. */
    listForEach(body) {
        let index = 0;
        let item = this._start;
        while (item !== null) {
            if (item.countable && !item.deleted) {
                const c = item.content.getContent();
                for (let i = 0; i < c.length; i++) {
                    body(c[i], index++, this);
                }
            }
            item = item.right;
        }
    }
    listMap(body) {
        const result = [];
        this.listForEach((element, index) => {
            result.push(body(element, index, this));
        });
        return result;
    }
    listCreateIterator() {
        let item = this._start;
        let currentContent = null;
        let currentContentIndex = 0;
        return {
            [Symbol.iterator]() { return this; },
            next: () => {
                // find some content
                if (currentContent === null) {
                    while (item != null && item.deleted) {
                        item = item.right;
                    }
                    if (item == null) {
                        return { done: true, value: undefined };
                    }
                    // we found n, so we can set currentContent
                    currentContent = item.content.getContent();
                    currentContentIndex = 0;
                    item = item.right; // we used the content of n, now iterate to next
                }
                const value = currentContent[currentContentIndex++];
                // check if we need to empty currentContent
                if (currentContent.length <= currentContentIndex) {
                    currentContent = null;
                }
                return { done: false, value };
            }
        };
    }
    /**
     * Executes a provided function on once on overy element of this YArray.
     * Operates on a snapshotted state of the document.
     */
    listForEachSnapshot(body, snapshot) {
        let index = 0;
        let item = this._start;
        while (item !== null) {
            if (item.countable && (0, internals_1.isVisible)(item, snapshot)) {
                const c = item.content.getContent();
                for (let i = 0; i < c.length; i++) {
                    body(c[i], index++, this);
                }
            }
            item = item.right;
        }
    }
    listGet(index) {
        const marker = internals_1.ArraySearchMarker_.find(this, index);
        let item = this._start;
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
    }
    // this -> parent
    listInsertGenericsAfter(transaction, referenceItem, contents) {
        let left = referenceItem;
        const doc = transaction.doc;
        const ownClientId = doc.clientID;
        const store = doc.store;
        const right = referenceItem === null ? this._start : referenceItem.right;
        let jsonContent = [];
        const packJsonContent = () => {
            if (jsonContent.length <= 0)
                return;
            const id = (0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId));
            const content = new internals_1.ContentAny(jsonContent);
            left = new internals_1.Item(id, left, left && left.lastID, right, right && right.id, this, null, content);
            left.integrate(transaction, 0);
            jsonContent = [];
        };
        contents.forEach(content => {
            if (content === null) {
                jsonContent.push(content);
            }
            else {
                if (content.constructor === Number ||
                    content.constructor === Object ||
                    content.constructor === Boolean ||
                    content.constructor === Array ||
                    content.constructor === String) {
                    jsonContent.push(content);
                }
                else {
                    packJsonContent();
                    if (content.constructor === Uint8Array ||
                        content.constructor === ArrayBuffer) {
                        const id = (0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId));
                        const icontent = new internals_1.ContentBinary(new Uint8Array(content));
                        left = new internals_1.Item(id, left, left && left.lastID, right, right && right.id, this, null, icontent);
                        left.integrate(transaction, 0);
                    }
                    else if (content.constructor === internals_1.Doc) {
                        const id = (0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId));
                        const icontent = new internals_1.ContentDoc(content);
                        left = new internals_1.Item(id, left, left && left.lastID, right, right && right.id, this, null, icontent);
                        left.integrate(transaction, 0);
                    }
                    else if (content instanceof AbstractType_) {
                        const id = (0, internals_1.createID)(ownClientId, (0, internals_1.getState)(store, ownClientId));
                        const icontent = new internals_1.ContentType(content);
                        left = new internals_1.Item(id, left, left && left.lastID, right, right && right.id, this, null, icontent);
                        left.integrate(transaction, 0);
                    }
                    else {
                        throw new Error('Unexpected content type in insert operation');
                    }
                }
            }
        });
        packJsonContent();
    }
    /**
     * this -> parent
     *
     * Pushing content is special as we generally want to push after the last item. So we don't have to update
     * the serach marker.
    */
    listPushGenerics(transaction, contents) {
        // Use the marker with the highest index and iterate to the right.
        const marker = (this._searchMarker || [])
            .reduce((maxMarker, currMarker) => {
            return currMarker.index > maxMarker.index ? currMarker : maxMarker;
        }, new internals_1.ArraySearchMarker_(this._start, 0));
        let item = marker.item;
        while (item === null || item === void 0 ? void 0 : item.right) {
            item = item.right;
        }
        return this.listInsertGenericsAfter(transaction, item, contents);
    }
    /** this -> parent */
    listDelete(transaction, index, length) {
        if (length === 0) {
            return;
        }
        const startIndex = index;
        const startLength = length;
        const marker = internals_1.ArraySearchMarker_.find(this, index);
        let item = this._start;
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
            throw new Error('Length exceeded!');
        }
        if (this._searchMarker) {
            internals_1.ArraySearchMarker_.updateChanges(this._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */);
        }
    }
    // this -> parent
    mapDelete(transaction, key) {
        const c = this._map.get(key);
        if (c !== undefined) {
            c.delete(transaction);
        }
    }
    // this -> parent
    mapSet(transaction, key, value) {
        const left = this._map.get(key) || null;
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
                    if (value instanceof AbstractType_) {
                        content = new internals_1.ContentType(value);
                    }
                    else {
                        throw new Error('Unexpected content type');
                    }
            }
        }
        const id = (0, internals_1.createID)(ownClientId, (0, internals_1.getState)(doc.store, ownClientId));
        new internals_1.Item(id, left, left && left.lastID, null, null, this, key, content)
            .integrate(transaction, 0);
    }
    // this -> parent
    mapGet(key) {
        const val = this._map.get(key);
        return val !== undefined && !val.deleted ? val.content.getContent()[val.length - 1] : undefined;
    }
    // this -> parent
    mapGetAll() {
        const res = {};
        this._map.forEach((value, key) => {
            if (!value.deleted) {
                res[key] = value.content.getContent()[value.length - 1];
            }
        });
        return res;
    }
    // this -> parent
    mapHas(key) {
        const val = this._map.get(key);
        return val !== undefined && !val.deleted;
    }
    // this -> parent
    mapGetSnapshot(key, snapshot) {
        let v = this._map.get(key) || null;
        while (v !== null && (!snapshot.sv.has(v.id.client) || v.id.clock >= (snapshot.sv.get(v.id.client) || 0))) {
            v = v.left;
        }
        return v !== null && (0, internals_1.isVisible)(v, snapshot) ? v.content.getContent()[v.length - 1] : undefined;
    }
    // ================================================================================================================ //
    // MARK: - Private Methods (Temporally public) -
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
    _write(_encoder) { }
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
exports.AbstractType_ = AbstractType_;
