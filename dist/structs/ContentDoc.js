"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentDoc = exports.ContentDoc = void 0;
const internals_1 = require("../internals");
const error = require("lib0/error");
const createDocFromOpts = (guid, opts) => {
    return new internals_1.Doc(Object.assign(Object.assign({ guid }, opts), { shouldLoad: opts.shouldLoad || opts.autoLoad || false }));
};
class ContentDoc {
    constructor(doc) {
        if (doc._item) {
            console.error('This document was already integrated as a sub-document. You should create a second instance instead with the same guid.');
        }
        this.doc = doc;
        const opts = {};
        if (!doc.gc) {
            opts["gc"] = false;
        }
        if (doc.autoLoad) {
            opts.autoLoad = true;
        }
        if (doc.meta !== null) {
            opts.meta = doc.meta;
        }
        this.opts = opts;
    }
    getLength() { return 1; }
    getContent() { return [this.doc]; }
    isCountable() { return true; }
    copy() { return new ContentDoc(createDocFromOpts(this.doc.guid, this.opts)); }
    splice(offset) { throw error.methodUnimplemented(); }
    mergeWith(right) {
        return false;
    }
    integrate(transaction, item) {
        // this needs to be reflected in doc.destroy as well
        this.doc._item = item;
        transaction.subdocsAdded.add(this.doc);
        if (this.doc.shouldLoad) {
            transaction.subdocsLoaded.add(this.doc);
        }
    }
    delete(transaction) {
        if (transaction.subdocsAdded.has(this.doc)) {
            transaction.subdocsAdded.delete(this.doc);
        }
        else {
            transaction.subdocsRemoved.add(this.doc);
        }
    }
    gc(store) { }
    write(encoder, offset) {
        encoder.writeString(this.doc.guid);
        encoder.writeAny(this.opts);
    }
    getRef() { return 9; }
}
exports.ContentDoc = ContentDoc;
const readContentDoc = (decoder) => {
    return new ContentDoc(createDocFromOpts(decoder.readString(), decoder.readAny()));
};
exports.readContentDoc = readContentDoc;
