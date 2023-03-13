"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYArray = exports.YArray = exports.YArrayEvent = void 0;
const AbstractType_1 = require("../types/AbstractType_");
const internals_1 = require("../internals");
/** Event that describes the changes on a YArray */
class YArrayEvent extends internals_1.YEvent {
    /**
     * @param {YArray<T>} yarray The changed type
     * @param {Transaction} transaction The transaction object
     */
    constructor(yarray, transaction) {
        super(yarray, transaction);
        this._transaction = transaction;
    }
}
exports.YArrayEvent = YArrayEvent;
/** A shared Array implementation. */
class YArray extends AbstractType_1.AbstractType_ {
    constructor() {
        super();
        this._prelimContent = [];
        this._searchMarker = [];
    }
    /** Construct a new YArray containing the specified items. */
    static from(items) {
        const a = new YArray();
        a.push(items);
        return a;
    }
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y, item) {
        var _a;
        super._integrate(y, item);
        this.insert(0, (_a = this._prelimContent) !== null && _a !== void 0 ? _a : []);
        this._prelimContent = null;
    }
    _copy() { return new YArray(); }
    clone() {
        const array = new YArray();
        array.insert(0, this.toArray().map(element => element instanceof AbstractType_1.AbstractType_
            ? element.clone()
            : element));
        return array;
    }
    get length() {
        return this._prelimContent === null ? this._length : this._prelimContent.length;
    }
    /**
     * Creates YArrayEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction, parentSubs) {
        super._callObserver(transaction, parentSubs);
        this.callObservers(transaction, new YArrayEvent(this, transaction));
    }
    /**
     * Inserts new content at an index.
     *
     * Important: This function expects an array of content. Not just a content
     * object. The reason for this "weirdness" is that inserting several elements
     * is very efficient when it is done as a single operation.
     *
     * @example
     *    // Insert character 'a' at position 0
     *    yarray.insert(0, ['a'])
     *    // Insert numbers 1, 2 at position 1
     *    yarray.insert(1, [1, 2])
     *
     * @param {number} index The index to insert content at.
     * @param {Array<T>} content The array of content
     */
    insert(index, content) {
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                this.listInsertGenerics(transaction, index, content);
            });
        }
        else {
            this._prelimContent.splice(index, 0, ...content);
        }
    }
    /**
     * Appends content to this YArray.
     *
     * @param {Array<T>} content Array of content to append.
     *
     * @todo Use the following implementation in all types.
     */
    push(content) {
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                this.listPushGenerics(transaction, content);
            });
        }
        else {
            this._prelimContent.push(...content);
        }
    }
    /**
     * Preppends content to this YArray.
     *
     * @param {Array<T>} content Array of content to preppend.
     */
    unshift(content) {
        this.insert(0, content);
    }
    /**
     * Deletes elements starting from an index.
     *
     * @param {number} index Index at which to start deleting elements
     * @param {number} length The number of elements to remove. Defaults to 1.
     */
    delete(index, length = 1) {
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                this.listDelete(transaction, index, length);
            });
        }
        else {
            this._prelimContent.splice(index, length);
        }
    }
    /**
     * Returns the i-th element from a YArray.
     *
     * @param {number} index The index of the element to return from the YArray
     * @return {T}
     */
    get(index) {
        return this.listGet(index);
    }
    /** Transforms this YArray to a JavaScript Array. */
    toArray() {
        return this.listToArray();
    }
    /** Transforms this YArray to a JavaScript Array. */
    slice(start = 0, end = this.length) {
        return this.listSlice(start, end);
    }
    /**
     * Transforms this Shared Type to a JSON object.
     */
    toJSON() {
        return this.map((c) => c instanceof AbstractType_1.AbstractType_ ? c.toJSON() : c);
    }
    /**
     * Returns an Array with the result of calling a provided function on every
     * element of this YArray.
     *
     * @template M
     * @param {function(T,number,YArray<T>):M} f Function that produces an element of the new Array
     * @return {Array<M>} A new array with each element being the result of the
     *                                 callback function
     */
    map(func) {
        return this.listMap(func);
    }
    /**
     * Executes a provided function on once on overy element of this YArray.
     *
     * @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
     */
    forEach(f) {
        this.listForEach(f);
    }
    [Symbol.iterator]() {
        return this.listCreateIterator();
    }
    _write(encoder) {
        encoder.writeTypeRef(internals_1.YArrayRefID);
    }
}
exports.YArray = YArray;
const readYArray = (_decoder) => {
    return new YArray();
};
exports.readYArray = readYArray;
