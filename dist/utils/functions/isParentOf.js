"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isParentOf = void 0;
/**
 * Check if `parent` is a parent of `child`.
 *
 * @param {AbstractType_<any>} parent
 * @param {Item|null} child
 * @return {Boolean} Whether `parent` is a parent of `child`.
 *
 * @private
 * @function
 */
const isParentOf = (parent, child) => {
    while (child !== null) {
        if (child.parent === parent) {
            return true;
        }
        child = child.parent._item;
    }
    return false;
};
exports.isParentOf = isParentOf;
