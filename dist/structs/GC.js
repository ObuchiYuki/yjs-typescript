"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GC = exports.structGCRefNumber = void 0;
const internals_1 = require("yjs/dist/src/internals");
exports.structGCRefNumber = 0;
/**
 * @private
 */
class GC extends internals_1.AbstractStruct {
    get deleted() { return true; }
    delete() { }
    mergeWith(right) {
        if (this.constructor !== right.constructor) {
            return false;
        }
        this.length += right.length;
        return true;
    }
    integrate(transaction, offset) {
        if (offset > 0) {
            this.id.clock += offset;
            this.length -= offset;
        }
        (0, internals_1.addStruct)(transaction.doc.store, this);
    }
    write(encoder, offset) {
        encoder.writeInfo(exports.structGCRefNumber);
        encoder.writeLen(this.length - offset);
    }
    getMissing(transaction, store) {
        return null;
    }
}
exports.GC = GC;
