"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentJSON = exports.ContentJSON = void 0;
/**
 * @private
 */
class ContentJSON {
    constructor(arr) {
        this.arr = arr;
    }
    getLength() { return this.arr.length; }
    getContent() { return this.arr; }
    isCountable() { return true; }
    copy() { return new ContentJSON(this.arr); }
    splice(offset) {
        const right = new ContentJSON(this.arr.slice(offset));
        this.arr = this.arr.slice(0, offset);
        return right;
    }
    mergeWith(right) {
        this.arr = this.arr.concat(right.arr);
        return true;
    }
    integrate(transaction, item) { }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) {
        const len = this.arr.length;
        encoder.writeLen(len - offset);
        for (let i = offset; i < len; i++) {
            const c = this.arr[i];
            encoder.writeString(c === undefined ? 'undefined' : JSON.stringify(c));
        }
    }
    getRef() { return 2; }
}
exports.ContentJSON = ContentJSON;
const readContentJSON = decoder => {
    const len = decoder.readLen();
    const cs = [];
    for (let i = 0; i < len; i++) {
        const c = decoder.readString();
        if (c === 'undefined') {
            cs.push(undefined);
        }
        else {
            cs.push(JSON.parse(c));
        }
    }
    return new ContentJSON(cs);
};
exports.readContentJSON = readContentJSON;
