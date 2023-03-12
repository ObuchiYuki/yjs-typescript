
import {
    YMap,
    YXmlHookRefID,
    UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2 // eslint-disable-line
} from '../internals'

/**
 * You can manage binding to a custom type with YXmlHook.
 */
export class YXmlHook extends YMap<any> {
    hookName: string

    /**
     * @param {string} hookName nodeName of the Dom Node.
     */
    constructor(hookName: string) {
        super()
        this.hookName = hookName
    }

    /**
     * Creates an Item with the same effect as this Item (without position effect)
     */
    _copy(): YXmlHook {
        return new YXmlHook(this.hookName)
    }

    clone(): YXmlHook {
        const el = new YXmlHook(this.hookName)
        this.forEach((value, key) => {
            el.set(key, value)
        })
        return el
    }

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
    toDOM(_document: Document = document, hooks: { [s: string]: any } = {}, binding: any): Element {
        const hook = hooks[this.hookName]
        let dom
        if (hook !== undefined) {
            dom = hook.createDom(this)
        } else {
            dom = document.createElement(this.hookName)
        }
        dom.setAttribute('data-yjs-hook', this.hookName)
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
     */
    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2) {
        encoder.writeTypeRef(YXmlHookRefID)
        encoder.writeKey(this.hookName)
    }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlHook}
 *
 * @private
 * @function
 */
export const readYXmlHook = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => {
    return new YXmlHook(decoder.readKey())
}
