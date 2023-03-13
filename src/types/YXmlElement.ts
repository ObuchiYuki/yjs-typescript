
import {
    YXmlFragment,
    transact,
    YXmlElementRefID,
    YXmlText, ContentType, AbstractType_, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Item // eslint-disable-line
} from '../internals'

/**
 * An YXmlElement imitates the behavior of a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}.
 *
 * * An YXmlElement has attributes (key value pairs)
 * * An YXmlElement has childElements that must inherit from YXmlElement
 */
export class YXmlElement extends YXmlFragment {
    nodeName: string
    _prelimAttrs: Map<string, any> | null = new Map()


    constructor (nodeName = 'UNDEFINED') {
        super()
        this.nodeName = nodeName
    }

    get nextSibling(): YXmlElement|YXmlText|null {
        const n = this._item ? this._item.next : null
        return n ? ((n.content as ContentType).type as YXmlElement|YXmlText) : null
    }

    get prevSibling(): YXmlElement|YXmlText|null {
        const n = this._item ? this._item.prev : null
        return n ? ((n.content as ContentType).type as YXmlElement|YXmlText) : null
    }

    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item) {
        super._integrate(y, item);
        this._prelimAttrs?.forEach((value, key) => {
            this.setAttribute(key, value)
        })
        this._prelimAttrs = null
    }

    /** Creates an Item with the same effect as this Item (without position effect) */
    _copy(): YXmlElement {
        return new YXmlElement(this.nodeName)
    }

    clone(): YXmlElement {
        const el = new YXmlElement(this.nodeName)
        const attrs = this.getAttributes()
        for (const key in attrs) {
            el.setAttribute(key, attrs[key])
        }

        el.insert(0, this.toArray().map((item): YXmlText | YXmlElement => {
            return (item instanceof AbstractType_ ? item.clone() : item) as YXmlText | YXmlElement
        }))
        return el
    }

    /**
     * Returns the XML serialization of this YXmlElement.
     * The attributes are ordered by attribute-name, so you can easily use this
     * method to compare YXmlElements
     *
     * @return {string} The string representation of this type.
     *
     * @public
     */
    toString(): string {
        const attrs = this.getAttributes()
        const stringBuilder = []
        const keys = []
        for (const key in attrs) {
            keys.push(key)
        }
        keys.sort()
        const keysLen = keys.length
        for (let i = 0; i < keysLen; i++) {
            const key = keys[i]
            stringBuilder.push(key + '="' + attrs[key] + '"')
        }
        const nodeName = this.nodeName.toLocaleLowerCase()
        const attrsString = stringBuilder.length > 0 ? ' ' + stringBuilder.join(' ') : ''
        return `<${nodeName}${attrsString}>${super.toString()}</${nodeName}>`
    }

    /**
     * Removes an attribute from this YXmlElement.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    removeAttribute (attributeName: string) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                this.mapDelete(transaction, attributeName)
            })
        } else {
            this._prelimAttrs?.delete(attributeName)
        }
    }

    /**
     * Sets or updates an attribute.
     *
     * @param {String} attributeName The attribute name that is to be set.
     * @param {String} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    setAttribute (attributeName: string, attributeValue: string) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                this.mapSet(transaction, attributeName, attributeValue)
            })
        } else {
            this._prelimAttrs?.set(attributeName, attributeValue)
        }
    }

    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @param {String} attributeName The attribute name that identifies the
     *                                                             queried value.
     * @return {String} The queried attribute value.
     *
     * @public
     */
    getAttribute(attributeName: string): string {
        return this.mapGet(attributeName) as any
    }

    /**
     * Returns whether an attribute exists
     *
     * @param {String} attributeName The attribute name to check for existence.
     * @return {boolean} whether the attribute exists.
     *
     * @public
     */
    hasAttribute(attributeName: string): boolean {
        return this.mapHas(attributeName)
    }

    /** Returns all attribute name/value pairs in a JSON Object. */
    getAttributes(): { [s: string]: any } {
        return this.mapGetAll()
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
        const dom = _document.createElement(this.nodeName)
        const attrs = this.getAttributes()
        for (const key in attrs) {
            dom.setAttribute(key, attrs[key])
        }
        this.listForEach(yxml => {
            dom.appendChild(yxml.toDOM(_document, hooks, binding))
        })
        if (binding !== undefined) {
            binding._createAssociation(dom, this)
        }
        return dom
    }

    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     *
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     */
    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2) {
        encoder.writeTypeRef(YXmlElementRefID)
        encoder.writeKey(this.nodeName)
    }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlElement}
 *
 * @function
 */
export const readYXmlElement = (decoder: UpdateDecoderV1 | UpdateDecoderV2): YXmlElement => {
    return new YXmlElement(decoder.readKey())
}
