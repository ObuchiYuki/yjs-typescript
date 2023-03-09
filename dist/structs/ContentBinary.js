"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentBinary = exports.ContentBinary = void 0;
const error = require("lib0/error");
class ContentBinary {
    constructor(content) {
        this.content = content;
    }
    getLength() { return 1; }
    getContent() { return [this.content]; }
    isCountable() { return true; }
    copy() { return new ContentBinary(this.content); }
    splice(offset) {
        throw error.methodUnimplemented();
    }
    mergeWith(right) {
        return false;
    }
    integrate(transaction, item) { }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) {
        encoder.writeBuf(this.content);
    }
    getRef() { return 3; }
}
exports.ContentBinary = ContentBinary;
const readContentBinary = (decoder) => {
    return new ContentBinary(decoder.readBuf());
};
exports.readContentBinary = readContentBinary;
