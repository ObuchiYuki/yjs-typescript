import { AbstractType_ } from "./AbstractType_"

import {
    YXmlEvent,
    YXmlElement,
    YXmlFragmentRefID,
    Doc, ContentType, Transaction, Item, YXmlText, YXmlHook, UpdateEncoderAny_, UpdateDecoderAny_, // eslint-disable-line

} from '../internals'
import { YXmlTreeWalker } from "./YXmlTreeWalker_"

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

type CSS_Selector = string

/**
 * Dom filter function.
 *
 * @callback domFilter
 * @param {string} nodeName The nodeName of the element
 * @param {Map} attributes The map of attributes.
 * @return {boolean} Whether to include the Dom node in the YXmlElement.
 */

/**
 * Represents a list of {@link YXmlElement}.and {@link YXmlText} types.
 * A YxmlFragment is similar to a {@link YXmlElement}, but it does not have a
 * nodeName and it does not have attributes. Though it can be bound to a DOM
 * element - in this case the attributes and the nodeName are not shared.
 *
 */
export class YXmlFragment extends AbstractType_<YXmlEvent> {
    _prelimContent: any[]|null

    constructor () {
        super()
        this._prelimContent = []
    }

    get firstChild(): YXmlElement|YXmlText|null {
        const first = this._first
        return first ? first.content.getContent()[0] : null
    }

    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item) {
        super._integrate(y, item)
        this.insert(0, this._prelimContent as any[])
        this._prelimContent = null
    }

    _copy(): YXmlFragment {
        return new YXmlFragment()
    }

    clone(): YXmlFragment {
        const el = new YXmlFragment()
        const array = this.toArray().map(item => {
            return item instanceof AbstractType_ ? item.clone() : item
        })
        el.insert(0, array as (YXmlElement | YXmlText)[])
        return el
    }

    get length () {
        return this._prelimContent === null ? this._length : this._prelimContent.length
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
     * @param {function(AbstractType_<any>):boolean} filter Function that is called on each child element and
     *                                                    returns a Boolean indicating whether the child
     *                                                    is to be included in the subtree.
     * @return {YXmlTreeWalker} A subtree and a position within it.
     *
     * @public
     */
    createTreeWalker(filter: (type: AbstractType_<any>) => boolean): YXmlTreeWalker {
        return new YXmlTreeWalker(this, filter)
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
    querySelector(query: CSS_Selector): YXmlElement | YXmlText | YXmlHook | null {
        query = query.toUpperCase()
        const iterator = new YXmlTreeWalker(this, element => {
            const xmlElement = element as YXmlElement
            return xmlElement.nodeName != null && xmlElement.nodeName.toUpperCase() === query
        })
        const next = iterator.next()
        if (next.done) {
            return null
        } else {
            return next.value
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
    querySelectorAll(query: CSS_Selector): Array<YXmlElement | YXmlText | YXmlHook | null> {
        query = query.toUpperCase()
        const walker = new YXmlTreeWalker(this, element => {
            const xmlElement = element as YXmlElement
            return xmlElement.nodeName != null && xmlElement.nodeName.toUpperCase() === query
        })
        return Array.from(walker)
    }

    /**
     * Creates YXmlEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>) {
        this.callObservers(transaction, new YXmlEvent(this, parentSubs, transaction))
    }

    /**
     * Get the string representation of all the children of this YXmlFragment.
     *
     * @return {string} The string representation of all children.
     */
    toString (): string {
        return this.listMap(xml => xml!.toString()).join('')
    }

    /**
     * @return {string}
     */
    toJSON(): string {
        return this.toString()
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
    toDOM(_document: Document = document, hooks: { [s: string]: any } = {}, binding: any): Node {
        const fragment = _document.createDocumentFragment()
        if (binding !== undefined) {
            binding._createAssociation(fragment, this)
        }
        this.listForEach(xmlType => {
            fragment.insertBefore(xmlType.toDOM(_document, hooks, binding), null)
        })
        return fragment
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
    insert(index: number, content: (YXmlElement | YXmlText)[]) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.listInsertGenerics(transaction, index, content)
            })
        } else {
            // _prelimContent is defined because this is not yet integrated
            this._prelimContent?.splice(index, 0, ...content)
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
    insertAfter(ref: null | Item | YXmlElement | YXmlText, content: Array<YXmlElement | YXmlText>) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                const refItem = (ref && ref instanceof AbstractType_) ? ref._item : ref
                this.listInsertGenericsAfter(transaction, refItem, content)
            })
        } else {
            const pc = this._prelimContent as any[]
            const index = ref === null ? 0 : pc.findIndex(el => el === ref) + 1
            if (index === 0 && ref !== null) {
                throw new Error('Reference item not found')
            }
            pc.splice(index, 0, ...content)
        }
    }

    /**
     * Deletes elements starting from an index.
     *
     * @param {number} index Index at which to start deleting elements
     * @param {number} [length=1] The number of elements to remove. Defaults to 1.
     */
    delete(index: number, length: number = 1) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.listDelete(transaction, index, length)
            })
        } else {
            // _prelimContent is defined because this is not yet integrated
            this._prelimContent?.splice(index, length)
        }
    }

    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @return {Array<YXmlElement|YXmlText|YXmlHook>}
     */
    toArray(): Array<YXmlElement | YXmlText | YXmlHook> {
        return this.listToArray()
    }

    /**
     * Appends content to this YArray.
     *
     * @param {Array<YXmlElement|YXmlText>} content Array of content to append.
     */
    push(content: Array<YXmlElement | YXmlText>) {
        this.insert(this.length, content)
    }

    /**
     * Preppends content to this YArray.
     *
     * @param {Array<YXmlElement|YXmlText>} content Array of content to preppend.
     */
    unshift(content: Array<YXmlElement | YXmlText>) {
        this.insert(0, content)
    }

    /**
     * Returns the i-th element from a YArray.
     *
     * @param {number} index The index of the element to return from the YArray
     * @return {YXmlElement|YXmlText}
     */
    get(index: number): YXmlElement | YXmlText {
        return this.listGet(index)
    }

    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @param {number} [start]
     * @param {number} [end]
     * @return {Array<YXmlElement|YXmlText>}
     */
    slice(start: number = 0, end: number = this.length): Array<YXmlElement | YXmlText> {
        return this.listSlice(start, end)
    }

    /**
     * Executes a provided function on once on overy child element.
     */
    forEach(f: (element: YXmlElement | YXmlText, index: number, self: this) => void) {
        this.listForEach(f)
    }

    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     *
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     */
    _write(encoder: UpdateEncoderAny_) {
        encoder.writeTypeRef(YXmlFragmentRefID)
    }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YXmlFragment}
 *
 * @private
 * @function
 */
export const readYXmlFragment = (_decoder: UpdateDecoderAny_): YXmlFragment => new YXmlFragment()
