"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDecoderV2 = exports.DSDecoderV2 = exports.UpdateDecoderV1 = exports.DSDecoderV1 = void 0;
const internals_1 = require("../internals");
const lib0 = require("lib0-typescript");
class DSDecoderV1 {
    constructor(decoder) {
        this.restDecoder = decoder;
    }
    resetDsCurVal() { }
    readDsClock() {
        return this.restDecoder.readVarUint();
    }
    readDsLen() {
        return this.restDecoder.readVarUint();
    }
}
exports.DSDecoderV1 = DSDecoderV1;
class UpdateDecoderV1 extends DSDecoderV1 {
    readLeftID() {
        return new internals_1.ID(this.restDecoder.readVarUint(), this.restDecoder.readVarUint());
    }
    readRightID() {
        return new internals_1.ID(this.restDecoder.readVarUint(), this.restDecoder.readVarUint());
    }
    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient() {
        return this.restDecoder.readVarUint();
    }
    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo() {
        return this.restDecoder.readUint8();
    }
    readString() {
        return this.restDecoder.readVarString();
    }
    readParentInfo() {
        return this.restDecoder.readVarUint() === 1;
    }
    readTypeRef() {
        return this.restDecoder.readVarUint();
    }
    /** Write len of a struct - well suited for Opt RLE encoder. */
    readLen() {
        return this.restDecoder.readVarUint();
    }
    readAny() {
        return this.restDecoder.readAny();
    }
    readBuf() {
        return this.restDecoder.readVarUint8Array();
    }
    /** Legacy implementation uses JSON parse. We use any-lib0 in v2. */
    readJSON() {
        return JSON.parse(this.restDecoder.readVarString());
    }
    readKey() {
        return this.restDecoder.readVarString();
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
        this.dsCurrVal += this.restDecoder.readVarUint();
        return this.dsCurrVal;
    }
    readDsLen() {
        const diff = this.restDecoder.readVarUint() + 1;
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
        decoder.readVarUint(); // read feature flag - currently unused
        this.keyClockDecoder = new lib0.IntDiffOptRleDecoder(decoder.readVarUint8Array());
        this.clientDecoder = new lib0.UintOptRleDecoder(decoder.readVarUint8Array());
        this.leftClockDecoder = new lib0.IntDiffOptRleDecoder(decoder.readVarUint8Array());
        this.rightClockDecoder = new lib0.IntDiffOptRleDecoder(decoder.readVarUint8Array());
        this.infoDecoder = new lib0.RleDecoder(decoder.readVarUint8Array(), decoder => decoder.readUint8());
        this.stringDecoder = new lib0.StringDecoder(decoder.readVarUint8Array());
        this.parentInfoDecoder = new lib0.RleDecoder(decoder.readVarUint8Array(), decoder => decoder.readUint8());
        this.typeRefDecoder = new lib0.UintOptRleDecoder(decoder.readVarUint8Array());
        this.lenDecoder = new lib0.UintOptRleDecoder(decoder.readVarUint8Array());
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
        return this.infoDecoder.read();
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
        return this.restDecoder.readAny();
    }
    readBuf() {
        return this.restDecoder.readVarUint8Array();
    }
    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    readJSON() {
        return this.restDecoder.readAny();
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
