"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareIDs = exports.ID = void 0;
class ID {
    constructor(client, clock) {
        this.client = client;
        this.clock = clock;
    }
    encode(encoder) {
        encoder.writeVarUint(this.client);
        encoder.writeVarUint(this.clock);
    }
    static decode(decoder) {
        return new ID(decoder.readVarUint(), decoder.readVarUint());
    }
}
exports.ID = ID;
const compareIDs = (a, b) => {
    return a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock);
};
exports.compareIDs = compareIDs;
