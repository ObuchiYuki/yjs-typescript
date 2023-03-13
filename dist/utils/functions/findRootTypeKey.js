"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRootTypeKey = void 0;
const error = require("lib0/error");
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
    throw error.unexpectedCase();
};
exports.findRootTypeKey = findRootTypeKey;
