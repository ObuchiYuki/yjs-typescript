"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRootTypeKey = exports.readID = exports.writeID = exports.createID = exports.compareIDs = exports.ID = void 0;
const decoding = require("lib0/decoding");
const encoding = require("lib0/encoding");
const error = require("lib0/error");
class ID {
    /**
     * @param {number} client client id
     * @param {number} clock unique per client id, continuous number
     */
    constructor(client, clock) {
        this.client = client;
        this.clock = clock;
    }
}
exports.ID = ID;
/**
 * @param {ID | null} a
 * @param {ID | null} b
 * @return {boolean}
 *
 * @function
 */
const compareIDs = (a, b) => {
    return a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock);
};
exports.compareIDs = compareIDs;
/**
 * @param {number} client
 * @param {number} clock
 *
 * @private
 * @function
 */
const createID = (client, clock) => {
    return new ID(client, clock);
};
exports.createID = createID;
/**
 * @param {encoding.Encoder} encoder
 * @param {ID} id
 *
 * @private
 * @function
 */
const writeID = (encoder, id) => {
    encoding.writeVarUint(encoder, id.client);
    encoding.writeVarUint(encoder, id.clock);
};
exports.writeID = writeID;
/**
 * Read ID.
 * * If first varUint read is 0xFFFFFF a RootID is returned.
 * * Otherwise an ID is returned
 *
 * @param {decoding.Decoder} decoder
 * @return {ID}
 *
 * @private
 * @function
 */
const readID = (decoder) => (0, exports.createID)(decoding.readVarUint(decoder), decoding.readVarUint(decoder));
exports.readID = readID;
/**
 * The top types are mapped from y.share.get(keyname) => type.
 * `type` does not store any information about the `keyname`.
 * This function finds the correct `keyname` for `type` and throws otherwise.
 *
 * @param {AbstractType<any>} type
 * @return {string}
 *
 * @private
 * @function
 */
const findRootTypeKey = (type) => {
    // @ts-ignore _y must be defined, otherwise unexpected case
    for (const [key, value] of type.doc.share.entries()) {
        if (value === type) {
            return key;
        }
    }
    throw error.unexpectedCase();
};
exports.findRootTypeKey = findRootTypeKey;
