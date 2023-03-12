"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentAny = exports.ContentAny = void 0;
class ContentAny {
    constructor(array) {
        this.array = array;
    }
    getLength() { return this.array.length; }
    getContent() { return this.array; }
    isCountable() { return true; }
    copy() { return new ContentAny(this.array); }
    splice(offset) {
        const right = new ContentAny(this.array.slice(offset));
        this.array = this.array.slice(0, offset);
        return right;
    }
    mergeWith(right) {
        this.array = this.array.concat(right.array);
        return true;
    }
    integrate(transaction, item) { }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) {
        const len = this.array.length;
        encoder.writeLen(len - offset);
        for (let i = offset; i < len; i++) {
            const c = this.array[i];
            encoder.writeAny(c);
        }
    }
    getRef() { return 8; }
}
exports.ContentAny = ContentAny;
const readContentAny = decoder => {
    const len = decoder.readLen();
    const cs = [];
    for (let i = 0; i < len; i++) {
        cs.push(decoder.readAny());
    }
    return new ContentAny(cs);
};
exports.readContentAny = readContentAny;
