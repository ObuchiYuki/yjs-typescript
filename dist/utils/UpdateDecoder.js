"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDecoderV2 = exports.DSDecoderV2 = exports.UpdateDecoderV1 = exports.DSDecoderV1 = void 0;
const buffer = require("lib0/buffer");
const decoding = require("lib0/decoding");
const internals_1 = require("../internals");
class DSDecoderV1 {
    constructor(decoder) {
        this.restDecoder = decoder;
    }
    resetDsCurVal() { }
    readDsClock() {
        return decoding.readVarUint(this.restDecoder);
    }
    readDsLen() {
        return decoding.readVarUint(this.restDecoder);
    }
}
exports.DSDecoderV1 = DSDecoderV1;
class UpdateDecoderV1 extends DSDecoderV1 {
    readLeftID() {
        return new internals_1.ID(decoding.readVarUint(this.restDecoder), decoding.readVarUint(this.restDecoder));
    }
    readRightID() {
        return new internals_1.ID(decoding.readVarUint(this.restDecoder), decoding.readVarUint(this.restDecoder));
    }
    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient() {
        return decoding.readVarUint(this.restDecoder);
    }
    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo() {
        return decoding.readUint8(this.restDecoder);
    }
    readString() {
        return decoding.readVarString(this.restDecoder);
    }
    readParentInfo() {
        return decoding.readVarUint(this.restDecoder) === 1;
    }
    readTypeRef() {
        return decoding.readVarUint(this.restDecoder);
    }
    /** Write len of a struct - well suited for Opt RLE encoder. */
    readLen() {
        return decoding.readVarUint(this.restDecoder);
    }
    readAny() {
        return decoding.readAny(this.restDecoder);
    }
    readBuf() {
        return buffer.copyUint8Array(decoding.readVarUint8Array(this.restDecoder));
    }
    /** Legacy implementation uses JSON parse. We use any-decoding in v2. */
    readJSON() {
        return JSON.parse(decoding.readVarString(this.restDecoder));
    }
    readKey() {
        return decoding.readVarString(this.restDecoder);
    }
}
exports.UpdateDecoderV1 = UpdateDecoderV1;
class DSDecoderV2 {
    constructor(decoder) {
        this.dsCurrVal = 0;
        this.restDecoder = decoder;
    }
    resetDsCurVal() {
        this.dsCurrVal = 0;
    }
    readDsClock() {
        this.dsCurrVal += decoding.readVarUint(this.restDecoder);
        return this.dsCurrVal;
    }
    readDsLen() {
        const diff = decoding.readVarUint(this.restDecoder) + 1;
        this.dsCurrVal += diff;
        return diff;
    }
}
exports.DSDecoderV2 = DSDecoderV2;
class UpdateDecoderV2 extends DSDecoderV2 {
    constructor(decoder) {
        super(decoder);
        /**
         * List of cached keys. If the keys[id] does not exist, we read a new key
         * from stringEncoder and push it to keys.
         */
        this.keys = [];
        decoding.readVarUint(decoder); // read feature flag - currently unused
        this.keyClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder));
        this.clientDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder));
        this.leftClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder));
        this.rightClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder));
        this.infoDecoder = new decoding.RleDecoder(decoding.readVarUint8Array(decoder), decoding.readUint8);
        this.stringDecoder = new decoding.StringDecoder(decoding.readVarUint8Array(decoder));
        this.parentInfoDecoder = new decoding.RleDecoder(decoding.readVarUint8Array(decoder), decoding.readUint8);
        this.typeRefDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder));
        this.lenDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder));
    }
    readLeftID() {
        return new internals_1.ID(this.clientDecoder.read(), this.leftClockDecoder.read());
    }
    readRightID() {
        return new internals_1.ID(this.clientDecoder.read(), this.rightClockDecoder.read());
    }
    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient() {
        return this.clientDecoder.read();
    }
    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo() {
        return /** @type {number} */ (this.infoDecoder.read());
    }
    readString() {
        return this.stringDecoder.read();
    }
    readParentInfo() {
        return this.parentInfoDecoder.read() === 1;
    }
    /**
     * @return {number} An unsigned 8-bit integer
     */
    readTypeRef() {
        return this.typeRefDecoder.read();
    }
    /**
     * Write len of a struct - well suited for Opt RLE encoder.
     */
    readLen() {
        return this.lenDecoder.read();
    }
    readAny() {
        return decoding.readAny(this.restDecoder);
    }
    readBuf() {
        return decoding.readVarUint8Array(this.restDecoder);
    }
    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    readJSON() {
        return decoding.readAny(this.restDecoder);
    }
    readKey() {
        const keyClock = this.keyClockDecoder.read();
        if (keyClock < this.keys.length) {
            return this.keys[keyClock];
        }
        else {
            const key = this.stringDecoder.read();
            this.keys.push(key);
            return key;
        }
    }
}
exports.UpdateDecoderV2 = UpdateDecoderV2;
