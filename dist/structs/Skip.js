"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skip = exports.structSkipRefNumber = void 0;
const error = require("lib0/error");
const encoding = require("lib0/encoding");
exports.structSkipRefNumber = 10;
class Skip {
    constructor(id, length) {
        this.id = id;
        this.length = length;
    }
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
