"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentDeleted = exports.ContentDeleted = void 0;
const internals_1 = require("../internals");
class ContentDeleted {
    constructor(len) {
        this.len = len;
    }
    getLength() { return this.len; }
    getContent() { return []; }
    isCountable() { return false; }
    copy() { return new ContentDeleted(this.len); }
    splice(offset) {
        const right = new ContentDeleted(this.len - offset);
        this.len = offset;
        return right;
    }
    mergeWith(right) {
        this.len += right.len;
        return true;
    }
    integrate(transaction, item) {
        (0, internals_1.addToDeleteSet)(transaction.deleteSet, item.id.client, item.id.clock, this.len);
        item.markDeleted();
    }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) { encoder.writeLen(this.len - offset); }
    getRef() { return 1; }
}
exports.ContentDeleted = ContentDeleted;
const readContentDeleted = decoder => {
    return new ContentDeleted(decoder.readLen());
};
exports.readContentDeleted = readContentDeleted;
