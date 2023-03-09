"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skip = exports.structSkipRefNumber = void 0;
const internals_1 = require("yjs/dist/src/internals");
const error = require("lib0/error");
const encoding = require("lib0/encoding");
exports.structSkipRefNumber = 10;
class Skip extends internals_1.AbstractStruct {
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
        // skip structs cannot be integrated
        error.unexpectedCase();
    }
    write(encoder, offset) {
        encoder.writeInfo(exports.structSkipRefNumber);
        // write as VarUint because Skips can't make use of predictable length-encoding
        encoding.writeVarUint(encoder.restEncoder, this.length - offset);
    }
    getMissing(transaction, store) {
        return null;
    }
}
exports.Skip = Skip;
