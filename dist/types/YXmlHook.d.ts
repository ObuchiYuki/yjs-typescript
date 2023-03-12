import { YMap, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2 } from '../internals';
/**
 * You can manage binding to a custom type with YXmlHook.
 */
export declare class YXmlHook extends YMap<any> {
    hookName: string;
    /**
     * @param {string} hookName nodeName of the Dom Node.
     */
    constructor(hookName: string);
    /**
     * Creates an Item with the same effect as this Item (without position effect)
     */
    _copy(): YXmlHook;
    clone(): YXmlHook;
    /**
     * Creates a Dom Element that mirrors this YXmlElement.
     *
     * @param {Document} [_document=document] The document object (you must define
     *                                                                                this when calling this method in
     *                                                                                nodejs)
     * @param {Object.<string, any>} [hooks] Optional property to customize how hooks
     *                                                                                         are presented in the DOM
     * @param {any} [binding] You should not set this property. This is
     *                                                             used if DomBinding wants to create a
     *                                                             association to the created DOM type
     * @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
     *
     * @public
     */
    toDOM(_document: Document | undefined, hooks: {
        [s: string]: any;
    } | undefined, binding: any): Element;
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     */
    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2): void;
}
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlHook}
 *
 * @private
 * @function
 */
export declare const readYXmlHook: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => YXmlHook;
