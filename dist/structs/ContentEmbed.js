"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readContentEmbed = exports.ContentEmbed = void 0;
const lib0 = require("lib0-typescript");
class ContentEmbed {
    constructor(embed) {
        this.embed = embed;
    }
    getLength() { return 1; }
    getContent() { return [this.embed]; }
    isCountable() { return true; }
    copy() { return new ContentEmbed(this.embed); }
    splice(offset) { throw new lib0.UnimplementedMethodError(); }
    mergeWith(right) { return false; }
    integrate(transaction, item) { }
    delete(transaction) { }
    gc(store) { }
    write(encoder, offset) { encoder.writeJSON(this.embed); }
    getRef() { return 5; }
}
exports.ContentEmbed = ContentEmbed;
const readContentEmbed = decoder => {
    return new ContentEmbed(decoder.readJSON());
};
exports.readContentEmbed = readContentEmbed;
