"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentString = exports.ContentString = void 0;
/**
 * @private
 */
class ContentString {
    constructor(str) {
        this.str = str;
    }
    getLength() { return this.str.length; }
    getContent() { return this.str.split(''); }
    isCountable() { return true; }
    copy() { return new ContentString(this.str); }
    splice(offset) {
        const right = new ContentString(this.str.slice(offset));
        this.str = this.str.slice(0, offset);
        // Prevent encoding invalid documents because of splitting of surrogate pairs: https://github.com/yjs/yjs/issues/248
        const firstCharCode = this.str.charCodeAt(offset - 1);
        if (firstCharCode >= 0xD800 && firstCharCode <= 0xDBFF) {
            // Last character of the left split is the start of a surrogate utf16/ucs2 pair.
            // We don't support splitting of surrogate pairs because this may lead to invalid documents.
            // Replace the invalid character with a unicode replacement character (� / U+FFFD)
            this.str = this.str.slice(0, offset - 1) + '�';
            // replace right as well
            right.str = '�' + right.str.slice(1);
        }
        return right;
    }
    mergeWith(right) {
        this.str += right.str;
        return true;
    }
    integrate(transaction, item) { }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) {
        encoder.writeString(offset === 0 ? this.str : this.str.slice(offset));
    }
    getRef() { return 4; }
}
exports.ContentString = ContentString;
const readContentString = (decoder) => {
    return new ContentString(decoder.readString());
};
exports.readContentString = readContentString;
