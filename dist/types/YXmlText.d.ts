import { YText, YXmlElement, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2 } from '../internals';
/**
 * Represents text in a Dom Element. In the future this type will also handle
 * simple formatting information like bold and italic.
 */
export declare class YXmlText extends YText {
    get nextSibling(): YXmlElement | YXmlText | null;
    get prevSibling(): YXmlElement | YXmlText | null;
    _copy(): YXmlText;
    clone(): YXmlText;
    /**
     * Creates a Dom Element that mirrors this YXmlText.
     *
     * @param {Document} [_document=document] The document object (you must define
     *                                                                                this when calling this method in
     *                                                                                nodejs)
     * @param {Object<string, any>} [hooks] Optional property to customize how hooks
     *                                                                                         are presented in the DOM
     * @param {any} [binding] You should not set this property. This is
     *                                                             used if DomBinding wants to create a
     *                                                             association to the created DOM type.
     * @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
     *
     * @public
     */
    toDOM(_document: Document | undefined, hooks: {
        [s: string]: any;
    }, binding: any): Text;
    toString(): any;
    toJSON(): string;
    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2): void;
}
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlText}
 *
 * @private
 * @function
 */
export declare const readYXmlText: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => YXmlText;
