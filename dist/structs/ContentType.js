"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentType = exports.ContentType = exports.YXmlTextRefID = exports.YXmlHookRefID = exports.YXmlFragmentRefID = exports.YXmlElementRefID = exports.YTextRefID = exports.YMapRefID = exports.YArrayRefID = exports.typeRefs = void 0;
const internals_1 = require("../internals");
const error = require("lib0/error");
exports.typeRefs = [
    internals_1.readYArray,
    internals_1.readYMap,
    internals_1.readYText,
    internals_1.readYXmlElement,
    internals_1.readYXmlFragment,
    internals_1.readYXmlHook,
    internals_1.readYXmlText
];
exports.YArrayRefID = 0;
exports.YMapRefID = 1;
exports.YTextRefID = 2;
exports.YXmlElementRefID = 3;
exports.YXmlFragmentRefID = 4;
exports.YXmlHookRefID = 5;
exports.YXmlTextRefID = 6;
class ContentType {
    constructor(type) {
        this.type = type;
    }
    getLength() { return 1; }
    getContent() { return [this.type]; }
    isCountable() { return true; }
    copy() { return new ContentType(this.type._copy()); }
    splice(offset) { throw error.methodUnimplemented(); }
    mergeWith(right) { return false; }
    integrate(transaction, item) {
        this.type._integrate(transaction.doc, item);
    }
    delete(transaction) {
        let item = this.type._start;
        while (item !== null) {
            if (!item.deleted) {
                item.delete(transaction);
            }
            else {
                // This will be gc'd later and we want to merge it if possible
                // We try to merge all deleted items after each transaction,
                // but we have no knowledge about that this needs to be merged
                // since it is not in transaction.ds. Hence we add it to transaction._mergeStructs
                transaction._mergeStructs.push(item);
            }
            item = item.right;
        }
        this.type._map.forEach(item => {
            if (!item.deleted) {
                item.delete(transaction);
            }
            else {
                // same as above
                transaction._mergeStructs.push(item);
            }
        });
        transaction.changed.delete(this.type);
    }
    gc(store) {
        let item = this.type._start;
        while (item !== null) {
            item.gc(store, true);
            item = item.right;
        }
        this.type._start = null;
        this.type._map.forEach((item) => {
            while (item !== null) {
                item.gc(store, true);
                item = item.left;
            }
        });
        this.type._map = new Map();
    }
    write(encoder, offset) {
        this.type._write(encoder);
    }
    getRef() { return 7; }
}
exports.ContentType = ContentType;
const readContentType = (decoder) => {
    return new ContentType(exports.typeRefs[decoder.readTypeRef()](decoder));
};
exports.readContentType = readContentType;
