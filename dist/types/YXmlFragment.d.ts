import { AbstractType_ } from "./AbstractType_";
import { YXmlEvent, YXmlElement, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Transaction, Item, YXmlText, YXmlHook } from '../internals';
/**
 * Define the elements to which a set of CSS queries apply.
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors|CSS_Selectors}
 *
 * @example
 *     query = '.classSelector'
 *     query = 'nodeSelector'
 *     query = '#idSelector'
 *
 * @typedef {string} CSS_Selector
 */
type CSS_Selector = string;
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
export declare class YXmlTreeWalker {
    _filter: (type: AbstractType_<any>) => boolean;
    _root: YXmlFragment | YXmlElement;
    _currentNode: Item;
    _firstCall: boolean;
    constructor(root: YXmlFragment | YXmlElement, f?: (type: AbstractType_<any>) => boolean);
    [Symbol.iterator](): this;
    /** Get the next node. */
    next(): IteratorResult<YXmlElement | YXmlText | YXmlHook>;
}
/**
 * Represents a list of {@link YXmlElement}.and {@link YXmlText} types.
 * A YxmlFragment is similar to a {@link YXmlElement}, but it does not have a
 * nodeName and it does not have attributes. Though it can be bound to a DOM
 * element - in this case the attributes and the nodeName are not shared.
 *
 */
export declare class YXmlFragment extends AbstractType_<YXmlEvent> {
    _prelimContent: any[] | null;
    constructor();
    get firstChild(): YXmlElement | YXmlText | null;
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item): void;
    _copy(): YXmlFragment;
    clone(): YXmlFragment;
    get length(): number;
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
     * @param {function(AbstractType_<any>):boolean} filter Function that is called on each child element and
     *                                                    returns a Boolean indicating whether the child
     *                                                    is to be included in the subtree.
     * @return {YXmlTreeWalker} A subtree and a position within it.
     *
     * @public
     */
    createTreeWalker(filter: (type: AbstractType_<any>) => boolean): YXmlTreeWalker;
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
    querySelector(query: CSS_Selector): YXmlElement | YXmlText | YXmlHook | null;
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
    querySelectorAll(query: CSS_Selector): Array<YXmlElement | YXmlText | YXmlHook | null>;
    /**
     * Creates YXmlEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>): void;
    /**
     * Get the string representation of all the children of this YXmlFragment.
     *
     * @return {string} The string representation of all children.
     */
    toString(): string;
    /**
     * @return {string}
     */
    toJSON(): string;
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
    toDOM(_document: Document | undefined, hooks: {
        [s: string]: any;
    } | undefined, binding: any): Node;
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
    insert(index: number, content: Array<YXmlElement | YXmlText>): void;
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
    insertAfter(ref: null | Item | YXmlElement | YXmlText, content: Array<YXmlElement | YXmlText>): void;
    /**
     * Deletes elements starting from an index.
     *
     * @param {number} index Index at which to start deleting elements
     * @param {number} [length=1] The number of elements to remove. Defaults to 1.
     */
    delete(index: number, length?: number): void;
    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @return {Array<YXmlElement|YXmlText|YXmlHook>}
     */
    toArray(): Array<YXmlElement | YXmlText | YXmlHook>;
    /**
     * Appends content to this YArray.
     *
     * @param {Array<YXmlElement|YXmlText>} content Array of content to append.
     */
    push(content: Array<YXmlElement | YXmlText>): void;
    /**
     * Preppends content to this YArray.
     *
     * @param {Array<YXmlElement|YXmlText>} content Array of content to preppend.
     */
    unshift(content: Array<YXmlElement | YXmlText>): void;
    /**
     * Returns the i-th element from a YArray.
     *
     * @param {number} index The index of the element to return from the YArray
     * @return {YXmlElement|YXmlText}
     */
    get(index: number): YXmlElement | YXmlText;
    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @param {number} [start]
     * @param {number} [end]
     * @return {Array<YXmlElement|YXmlText>}
     */
    slice(start?: number, end?: number): Array<YXmlElement | YXmlText>;
    /**
     * Executes a provided function on once on overy child element.
     *
     * @param {function(YXmlElement|YXmlText,number, typeof self):void} f A function to execute on every element of this YArray.
     */
    forEach(f: (arg0: YXmlElement | YXmlText, arg1: number, arg2: typeof self) => void): void;
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     *
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     */
    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2): void;
}
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YXmlFragment}
 *
 * @private
 * @function
 */
export declare const readYXmlFragment: (_decoder: UpdateDecoderV1 | UpdateDecoderV2) => YXmlFragment;
export {};
