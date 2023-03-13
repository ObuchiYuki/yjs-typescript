"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equalAttributes_ = void 0;
const object = require("lib0/object");
const equalAttributes_ = (a, b) => {
    if (a === b)
        return true;
    if (typeof a === 'object' && typeof b === 'object') {
        return (a && b && object.equalFlat(a, b));
    }
    return false;
};
exports.equalAttributes_ = equalAttributes_;
