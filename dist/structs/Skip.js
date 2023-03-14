"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skip = exports.structSkipRefNumber = void 0;
const Struct_1 = require("./Struct_");
const encoding = require("lib0/encoding");
const lib0 = require("lib0-typescript");
exports.structSkipRefNumber = 10;
class Skip extends Struct_1.Struct_ {
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
        throw new lib0.UnexpectedCaseError();
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
