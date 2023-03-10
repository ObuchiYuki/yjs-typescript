"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GC = exports.structGCRefNumber = void 0;
const Struct_1 = require("./Struct_");
exports.structGCRefNumber = 0;
class GC extends Struct_1.Struct_ {
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
        transaction.doc.store.addStruct(this);
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
