"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logType = void 0;
/**
 * Convenient helper to log type information.
 *
 * Do not use in productive systems as the output can be immense!
 *
 * @param {AbstractType<any>} type
 */
const logType = (type) => {
    const res = [];
    let n = type._start;
    while (n) {
        res.push(n);
        n = n.right;
    }
    console.log('Children: ', res);
    console.log('Children content: ', res.filter(m => !m.deleted).map(m => m.content));
};
exports.logType = logType;
