"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Struct_ = void 0;
const internals_1 = require("../internals");
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
    // try to
    static tryMergeWithLeft(structs, pos) {
        const left = structs[pos - 1];
        const right = structs[pos];
        if (left.deleted === right.deleted && left.constructor === right.constructor) {
            if (left.mergeWith(right)) {
                structs.splice(pos, 1);
                if (right instanceof internals_1.Item && right.parentSub !== null && right.parent._map.get(right.parentSub) === right) {
                    right.parent._map.set(right.parentSub, left);
                }
            }
        }
    }
}
exports.Struct_ = Struct_;
