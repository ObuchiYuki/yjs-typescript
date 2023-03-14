"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRootTypeKey = void 0;
const lib0 = require("lib0-typescript");
/**
 * The top types are mapped from y.share.get(keyname) => type.
 * `type` does not store any information about the `keyname`.
 * This function finds the correct `keyname` for `type` and throws otherwise.
 */
const findRootTypeKey = (type) => {
    for (const [key, value] of type.doc.share.entries()) {
        if (value === type) {
            return key;
        }
    }
    throw new lib0.UnexpectedCaseError();
};
exports.findRootTypeKey = findRootTypeKey;
