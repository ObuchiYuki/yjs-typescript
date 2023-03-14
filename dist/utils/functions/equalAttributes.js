"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equalAttributes_ = void 0;
const equalFlat = (a, b) => {
    if (a === b)
        return true;
    if (a.keys().length !== b.keys().length)
        return false;
    for (const key in a) {
        const value = a[key];
        if (!(value !== undefined || b.hasOwnProperty(key)) && b[key] === value)
            return false;
    }
    return true;
};
const equalAttributes_ = (a, b) => {
    if (a === b)
        return true;
    if (typeof a === 'object' && typeof b === 'object') {
        return (a && b && equalFlat(a, b));
    }
    return false;
};
exports.equalAttributes_ = equalAttributes_;
