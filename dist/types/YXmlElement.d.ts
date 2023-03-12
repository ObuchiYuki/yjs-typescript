import { YXmlFragment, YXmlText, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Item } from '../internals';
/**
 * An YXmlElement imitates the behavior of a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}.
 *
 * * An YXmlElement has attributes (key value pairs)
 * * An YXmlElement has childElements that must inherit from YXmlElement
 */
export declare class YXmlElement extends YXmlFragment {
    nodeName: string;
    _prelimAttrs: Map<string, any> | null;
    constructor(nodeName?: string);
    get nextSibling(): YXmlElement | YXmlText | null;
    get prevSibling(): YXmlElement | YXmlText | null;
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item): void;
    /** Creates an Item with the same effect as this Item (without position effect) */
    _copy(): YXmlElement;
    clone(): YXmlElement;
    /**
     * Returns the XML serialization of this YXmlElement.
     * The attributes are ordered by attribute-name, so you can easily use this
     * method to compare YXmlElements
     *
     * @return {string} The string representation of this type.
     *
     * @public
     */
    toString(): string;
    /**
     * Removes an attribute from this YXmlElement.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    removeAttribute(attributeName: string): void;
    /**
     * Sets or updates an attribute.
     *
     * @param {String} attributeName The attribute name that is to be set.
     * @param {String} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    setAttribute(attributeName: string, attributeValue: string): void;
    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @param {String} attributeName The attribute name that identifies the
     *                                                             queried value.
     * @return {String} The queried attribute value.
     *
     * @public
     */
    getAttribute(attributeName: string): string;
    /**
     * Returns whether an attribute exists
     *
     * @param {String} attributeName The attribute name to check for existence.
     * @return {boolean} whether the attribute exists.
     *
     * @public
     */
    hasAttribute(attributeName: string): boolean;
    /** Returns all attribute name/value pairs in a JSON Object. */
    getAttributes(): {
        [s: string]: any;
    };
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
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlElement}
 *
 * @function
 */
export declare const readYXmlElement: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => YXmlElement;
