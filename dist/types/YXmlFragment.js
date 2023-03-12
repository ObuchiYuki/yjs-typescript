"use strict";
/**
 * @module YXml
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYXmlFragment = exports.YXmlFragment = exports.YXmlTreeWalker = void 0;
const internals_1 = require("../internals");
const error = require("lib0/error");
const array = require("lib0/array");
/**
 * Dom filter function.
 *
 * @callback domFilter
 * @param {string} nodeName The nodeName of the element
 * @param {Map} attributes The map of attributes.
 * @return {boolean} Whether to include the Dom node in the YXmlElement.
 */
/**
 * Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
 * position within them.
 *
 * Can be created with {@link YXmlFragment#createTreeWalker}
 *
 * @public
 * @implements {Iterable<YXmlElement|YXmlText|YXmlElement|YXmlHook>}
 */
class YXmlTreeWalker {
    constructor(root, f = () => true) {
        this._filter = f;
        this._root = root;
        this._currentNode = root._start;
        this._firstCall = true;
    }
    [Symbol.iterator]() {
        return this;
    }
    /** Get the next node. */
    next() {
        let n = this._currentNode;
        let type = n && n.content && n.content.type;
        if (n !== null && (!this._firstCall || n.deleted || !this._filter(type))) { // if first call, we check if we can use the first item
            do {
                type = n.content.type;
                if (!n.deleted && (type.constructor === internals_1.YXmlElement || type.constructor === YXmlFragment) && type._start !== null) {
                    // walk down in the tree
                    n = type._start;
                }
                else {
                    // walk right or up in the tree
                    while (n !== null) {
                        if (n.right !== null) {
                            n = n.right;
                            break;
                        }
                        else if (n.parent === this._root) {
                            n = null;
                        }
                        else {
                            n = n.parent._item;
                        }
                    }
                }
            } while (n !== null && (n.deleted || !this._filter(n.content.type)));
        }
        this._firstCall = false;
        if (n === null) {
            // @ts-ignore
            return { value: undefined, done: true };
        }
        this._currentNode = n;
        return { value: n.content.type, done: false };
    }
}
exports.YXmlTreeWalker = YXmlTreeWalker;
/**
 * Represents a list of {@link YXmlElement}.and {@link YXmlText} types.
 * A YxmlFragment is similar to a {@link YXmlElement}, but it does not have a
 * nodeName and it does not have attributes. Though it can be bound to a DOM
 * element - in this case the attributes and the nodeName are not shared.
 *
 */
class YXmlFragment extends internals_1.AbstractType {
    constructor() {
        super();
        this._prelimContent = [];
    }
    get firstChild() {
        const first = this._first;
        return first ? first.content.getContent()[0] : null;
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
        this.insert(0, this._prelimContent);
        this._prelimContent = null;
    }
    _copy() {
        return new YXmlFragment();
    }
    clone() {
        const el = new YXmlFragment();
        // @ts-ignore
        el.insert(0, this.toArray().map(item => item instanceof internals_1.AbstractType ? item.clone() : item));
        return el;
    }
    get length() {
        return this._prelimContent === null ? this._length : this._prelimContent.length;
    }
    /**
     * Create a subtree of childNodes.
     *
     * @example
     * const walker = elem.createTreeWalker(dom => dom.nodeName === 'div')
     * for (let node in walker) {
     *     // `node` is a div node
     *     nop(node)
     * }
     *
     * @param {function(AbstractType<any>):boolean} filter Function that is called on each child element and
     *                                                    returns a Boolean indicating whether the child
     *                                                    is to be included in the subtree.
     * @return {YXmlTreeWalker} A subtree and a position within it.
     *
     * @public
     */
    createTreeWalker(filter) {
        return new YXmlTreeWalker(this, filter);
    }
    /**
     * Returns the first YXmlElement that matches the query.
     * Similar to DOM's {@link querySelector}.
     *
     * Query support:
     *     - tagname
     * TODO:
     *     - id
     *     - attribute
     *
     * @param {CSS_Selector} query The query on the children.
     * @return {YXmlElement|YXmlText|YXmlHook|null} The first element that matches the query or null.
     *
     * @public
     */
    querySelector(query) {
        query = query.toUpperCase();
        // @ts-ignore
        const iterator = new YXmlTreeWalker(this, element => element.nodeName && element.nodeName.toUpperCase() === query);
        const next = iterator.next();
        if (next.done) {
            return null;
        }
        else {
            return next.value;
        }
    }
    /**
     * Returns all YXmlElements that match the query.
     * Similar to Dom's {@link querySelectorAll}.
     *
     * @todo Does not yet support all queries. Currently only query by tagName.
     *
     * @param {CSS_Selector} query The query on the children
     * @return {Array<YXmlElement|YXmlText|YXmlHook|null>} The elements that match this query.
     *
     * @public
     */
    querySelectorAll(query) {
        query = query.toUpperCase();
        // @ts-ignore
        return array.from(new YXmlTreeWalker(this, element => element.nodeName && element.nodeName.toUpperCase() === query));
    }
    /**
     * Creates YXmlEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction, parentSubs) {
        (0, internals_1.callTypeObservers)(this, transaction, new internals_1.YXmlEvent(this, parentSubs, transaction));
    }
    /**
     * Get the string representation of all the children of this YXmlFragment.
     *
     * @return {string} The string representation of all children.
     */
    toString() {
        return (0, internals_1.typeListMap)(this, xml => xml.toString()).join('');
    }
    /**
     * @return {string}
     */
    toJSON() {
        return this.toString();
    }
    /**
     * Creates a Dom Element that mirrors this YXmlElement.
     *
     * @param {Document} [_document=document] The document object (you must define
     *                                                                                this when calling this method in
     *                                                                                nodejs)
     * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
     *                                                                                         are presented in the DOM
     * @param {any} [binding] You should not set this property. This is
     *                                                             used if DomBinding wants to create a
     *                                                             association to the created DOM type.
     * @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
     *
     * @public
     */
    toDOM(_document = document, hooks = {}, binding) {
        const fragment = _document.createDocumentFragment();
        if (binding !== undefined) {
            binding._createAssociation(fragment, this);
        }
        (0, internals_1.typeListForEach)(this, xmlType => {
            fragment.insertBefore(xmlType.toDOM(_document, hooks, binding), null);
        });
        return fragment;
    }
    /**
     * Inserts new content at an index.
     *
     * @example
     *    // Insert character 'a' at position 0
     *    xml.insert(0, [new Y.XmlText('text')])
     *
     * @param {number} index The index to insert content at
     * @param {Array<YXmlElement|YXmlText>} content The array of content
     */
    insert(index, content) {
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                (0, internals_1.typeListInsertGenerics)(transaction, this, index, content);
            });
        }
        else {
            // @ts-ignore _prelimContent is defined because this is not yet integrated
            this._prelimContent.splice(index, 0, ...content);
        }
    }
    /**
     * Inserts new content at an index.
     *
     * @example
     *    // Insert character 'a' at position 0
     *    xml.insert(0, [new Y.XmlText('text')])
     *
     * @param {null|Item|YXmlElement|YXmlText} ref The index to insert content at
     * @param {Array<YXmlElement|YXmlText>} content The array of content
     */
    insertAfter(ref, content) {
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                const refItem = (ref && ref instanceof internals_1.AbstractType) ? ref._item : ref;
                (0, internals_1.typeListInsertGenericsAfter)(transaction, this, refItem, content);
            });
        }
        else {
            const pc = this._prelimContent;
            const index = ref === null ? 0 : pc.findIndex(el => el === ref) + 1;
            if (index === 0 && ref !== null) {
                throw error.create('Reference item not found');
            }
            pc.splice(index, 0, ...content);
        }
    }
    /**
     * Deletes elements starting from an index.
     *
     * @param {number} index Index at which to start deleting elements
     * @param {number} [length=1] The number of elements to remove. Defaults to 1.
     */
    delete(index, length = 1) {
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                (0, internals_1.typeListDelete)(transaction, this, index, length);
            });
        }
        else {
            // @ts-ignore _prelimContent is defined because this is not yet integrated
            this._prelimContent.splice(index, length);
        }
    }
    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @return {Array<YXmlElement|YXmlText|YXmlHook>}
     */
    toArray() {
        return (0, internals_1.typeListToArray)(this);
    }
    /**
     * Appends content to this YArray.
     *
     * @param {Array<YXmlElement|YXmlText>} content Array of content to append.
     */
    push(content) {
        this.insert(this.length, content);
    }
    /**
     * Preppends content to this YArray.
     *
     * @param {Array<YXmlElement|YXmlText>} content Array of content to preppend.
     */
    unshift(content) {
        this.insert(0, content);
    }
    /**
     * Returns the i-th element from a YArray.
     *
     * @param {number} index The index of the element to return from the YArray
     * @return {YXmlElement|YXmlText}
     */
    get(index) {
        return (0, internals_1.typeListGet)(this, index);
    }
    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @param {number} [start]
     * @param {number} [end]
     * @return {Array<YXmlElement|YXmlText>}
     */
    slice(start = 0, end = this.length) {
        return (0, internals_1.typeListSlice)(this, start, end);
    }
    /**
     * Executes a provided function on once on overy child element.
     *
     * @param {function(YXmlElement|YXmlText,number, typeof self):void} f A function to execute on every element of this YArray.
     */
    forEach(f) {
        (0, internals_1.typeListForEach)(this, f);
    }
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     *
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     */
    _write(encoder) {
        encoder.writeTypeRef(internals_1.YXmlFragmentRefID);
    }
}
exports.YXmlFragment = YXmlFragment;
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YXmlFragment}
 *
 * @private
 * @function
 */
const readYXmlFragment = (_decoder) => new YXmlFragment();
exports.readYXmlFragment = readYXmlFragment;