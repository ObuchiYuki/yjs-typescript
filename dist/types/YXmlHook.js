"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYXmlHook = exports.YXmlHook = void 0;
const internals_1 = require("../internals");
/**
 * You can manage binding to a custom type with YXmlHook.
 */
class YXmlHook extends internals_1.YMap {
    /**
     * @param {string} hookName nodeName of the Dom Node.
     */
    constructor(hookName) {
        super();
        this.hookName = hookName;
    }
    /**
     * Creates an Item with the same effect as this Item (without position effect)
     */
    _copy() {
        return new YXmlHook(this.hookName);
    }
    clone() {
        const el = new YXmlHook(this.hookName);
        this.forEach((value, key) => {
            el.set(key, value);
        });
        return el;
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
    toDOM(_document = document, hooks = {}, binding) {
        const hook = hooks[this.hookName];
        let dom;
        if (hook !== undefined) {
            dom = hook.createDom(this);
        }
        else {
            dom = document.createElement(this.hookName);
        }
        dom.setAttribute('data-yjs-hook', this.hookName);
        if (binding !== undefined) {
            binding._createAssociation(dom, this);
        }
        return dom;
    }
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     */
    _write(encoder) {
        encoder.writeTypeRef(internals_1.YXmlHookRefID);
        encoder.writeKey(this.hookName);
    }
}
exports.YXmlHook = YXmlHook;
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlHook}
 *
 * @private
 * @function
 */
const readYXmlHook = (decoder) => {
    return new YXmlHook(decoder.readKey());
};
exports.readYXmlHook = readYXmlHook;
