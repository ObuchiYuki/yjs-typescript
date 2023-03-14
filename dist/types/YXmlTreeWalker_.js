"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YXmlTreeWalker = void 0;
const internals_1 = require("../internals");
/**
 * Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
 * position within them.
 *
 * Can be created with {@link YXmlFragment#createTreeWalker}
 *
 * @public
 * @implements {Iterable<YXmlElement|YXmlText|YXmlElement|YXmlHook>}
 */
class YXmlTreeWalker {
    constructor(root, f = () => true) {
        this._filter = f;
        this._root = root;
        this._currentNode = root._start;
        this._firstCall = true;
    }
    [Symbol.iterator]() {
        return this;
    }
    /** Get the next node. */
    next() {
        let n = this._currentNode;
        let type = n && n.content && n.content.type;
        if (n !== null && (!this._firstCall || n.deleted || !this._filter(type))) { // if first call, we check if we can use the first item
            do {
                type = n.content.type;
                if (!n.deleted && (type.constructor === internals_1.YXmlElement || type.constructor === internals_1.YXmlFragment) && type._start !== null) {
                    // walk down in the tree
                    n = type._start;
                }
                else {
                    // walk right or up in the tree
                    while (n !== null) {
                        if (n.right !== null) {
                            n = n.right;
                            break;
                        }
                        else if (n.parent === this._root) {
                            n = null;
                        }
                        else {
                            n = n.parent._item;
                        }
                    }
                }
            } while (n !== null && (n.deleted || !this._filter(n.content.type)));
        }
        this._firstCall = false;
        if (n === null) {
            return { value: undefined, done: true };
        }
        this._currentNode = n;
        return { value: n.content.type, done: false };
    }
}
exports.YXmlTreeWalker = YXmlTreeWalker;
