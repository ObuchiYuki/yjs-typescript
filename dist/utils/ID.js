"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareIDs = exports.ID = void 0;
const decoding = require("lib0/decoding");
const encoding = require("lib0/encoding");
class ID {
    constructor(client, clock) {
        this.client = client;
        this.clock = clock;
    }
    encode(encoder) {
        encoding.writeVarUint(encoder, this.client);
        encoding.writeVarUint(encoder, this.clock);
    }
    static decode(decoder) {
        return new ID(decoding.readVarUint(decoder), decoding.readVarUint(decoder));
    }
}
exports.ID = ID;
const compareIDs = (a, b) => {
    return a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock);
};
exports.compareIDs = compareIDs;
