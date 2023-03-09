"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentAny = exports.ContentAny = void 0;
class ContentAny {
    constructor(arr) {
        this.arr = arr;
    }
    getLength() {
        return this.arr.length;
    }
    getContent() {
        return this.arr;
    }
    isCountable() {
        return true;
    }
    copy() {
        return new ContentAny(this.arr);
    }
    splice(offset) {
        const right = new ContentAny(this.arr.slice(offset));
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
            encoder.writeAny(c);
        }
    }
    getRef() {
        return 8;
    }
}
exports.ContentAny = ContentAny;
const readContentAny = (decoder) => {
    const len = decoder.readLen();
    const cs = [];
    for (let i = 0; i < len; i++) {
        cs.push(decoder.readAny());
    }
    return new ContentAny(cs);
};
exports.readContentAny = readContentAny;
