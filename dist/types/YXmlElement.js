"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYXmlElement = exports.YXmlElement = void 0;
const internals_1 = require("../internals");
/**
 * An YXmlElement imitates the behavior of a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}.
 *
 * * An YXmlElement has attributes (key value pairs)
 * * An YXmlElement has childElements that must inherit from YXmlElement
 */
class YXmlElement extends internals_1.YXmlFragment {
    constructor(nodeName = 'UNDEFINED') {
        super();
        this._prelimAttrs = new Map();
        this.nodeName = nodeName;
    }
    get nextSibling() {
        const n = this._item ? this._item.next : null;
        return n ? n.content.type : null;
    }
    get prevSibling() {
        const n = this._item ? this._item.prev : null;
        return n ? n.content.type : null;
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
        (_a = this._prelimAttrs) === null || _a === void 0 ? void 0 : _a.forEach((value, key) => {
            this.setAttribute(key, value);
        });
        this._prelimAttrs = null;
    }
    /** Creates an Item with the same effect as this Item (without position effect) */
    _copy() {
        return new YXmlElement(this.nodeName);
    }
    clone() {
        const el = new YXmlElement(this.nodeName);
        const attrs = this.getAttributes();
        for (const key in attrs) {
            el.setAttribute(key, attrs[key]);
        }
        el.insert(0, this.toArray().map((item) => {
            return (item instanceof internals_1.AbstractType_ ? item.clone() : item);
        }));
        return el;
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
    toString() {
        const attrs = this.getAttributes();
        const stringBuilder = [];
        const keys = [];
        for (const key in attrs) {
            keys.push(key);
        }
        keys.sort();
        const keysLen = keys.length;
        for (let i = 0; i < keysLen; i++) {
            const key = keys[i];
            stringBuilder.push(key + '="' + attrs[key] + '"');
        }
        const nodeName = this.nodeName.toLocaleLowerCase();
        const attrsString = stringBuilder.length > 0 ? ' ' + stringBuilder.join(' ') : '';
        return `<${nodeName}${attrsString}>${super.toString()}</${nodeName}>`;
    }
    /**
     * Removes an attribute from this YXmlElement.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    removeAttribute(attributeName) {
        var _a;
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                this.mapDelete(transaction, attributeName);
            });
        }
        else {
            (_a = this._prelimAttrs) === null || _a === void 0 ? void 0 : _a.delete(attributeName);
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
    setAttribute(attributeName, attributeValue) {
        var _a;
        if (this.doc !== null) {
            (0, internals_1.transact)(this.doc, transaction => {
                this.mapSet(transaction, attributeName, attributeValue);
            });
        }
        else {
            (_a = this._prelimAttrs) === null || _a === void 0 ? void 0 : _a.set(attributeName, attributeValue);
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
    getAttribute(attributeName) {
        return this.mapGet(attributeName);
    }
    /**
     * Returns whether an attribute exists
     *
     * @param {String} attributeName The attribute name to check for existence.
     * @return {boolean} whether the attribute exists.
     *
     * @public
     */
    hasAttribute(attributeName) {
        return this.mapHas(attributeName);
    }
    /** Returns all attribute name/value pairs in a JSON Object. */
    getAttributes() {
        return this.mapGetAll();
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
        const dom = _document.createElement(this.nodeName);
        const attrs = this.getAttributes();
        for (const key in attrs) {
            dom.setAttribute(key, attrs[key]);
        }
        this.listForEach(yxml => {
            dom.appendChild(yxml.toDOM(_document, hooks, binding));
        });
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
     *
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     */
    _write(encoder) {
        encoder.writeTypeRef(internals_1.YXmlElementRefID);
        encoder.writeKey(this.nodeName);
    }
}
exports.YXmlElement = YXmlElement;
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlElement}
 *
 * @function
 */
const readYXmlElement = (decoder) => {
    return new YXmlElement(decoder.readKey());
};
exports.readYXmlElement = readYXmlElement;
