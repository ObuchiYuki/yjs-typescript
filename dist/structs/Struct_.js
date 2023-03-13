"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Struct_ = void 0;
class Struct_ {
    constructor(id, length) {
        this.id = id;
        this.length = length;
    }
    /**
     * Merge this struct with the item to the right.
     * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
     * Also this method does *not* remove right from StructStore!
     * @param {AbstractStruct} right
     * @return {boolean} wether this merged with right
     */
    mergeWith(right) { return false; }
}
exports.Struct_ = Struct_;
