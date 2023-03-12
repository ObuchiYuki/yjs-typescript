"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentFormat = exports.ContentFormat = void 0;
const error = require("lib0/error");
class ContentFormat {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
    getLength() { return 1; }
    getContent() { return []; }
    isCountable() { return false; }
    copy() { return new ContentFormat(this.key, this.value); }
    splice(offset) { throw error.methodUnimplemented(); }
    mergeWith(right) { return false; }
    integrate(transaction, item) {
        // @todo searchmarker are currently unsupported for rich text documents
        item.parent._searchMarker = null;
    }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) {
        encoder.writeKey(this.key);
        encoder.writeJSON(this.value);
    }
    getRef() { return 6; }
}
exports.ContentFormat = ContentFormat;
const readContentFormat = decoder => {
    return new ContentFormat(decoder.readKey(), decoder.readJSON());
};
exports.readContentFormat = readContentFormat;
