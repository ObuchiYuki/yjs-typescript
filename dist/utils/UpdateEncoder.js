"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEncoderV2 = exports.DSEncoderV2 = exports.UpdateEncoderV1 = exports.DSEncoderV1 = void 0;
const lib0 = require("lib0-typescript");
class DSEncoderV1 {
    constructor() {
        this.restEncoder = new lib0.Encoder();
    }
    toUint8Array() {
        return this.restEncoder.toUint8Array();
    }
    resetDsCurVal() {
        // nop
    }
    writeDsClock(clock) {
        this.restEncoder.writeVarUint(clock);
    }
    writeDsLen(len) {
        this.restEncoder.writeVarUint(len);
    }
}
exports.DSEncoderV1 = DSEncoderV1;
class UpdateEncoderV1 extends DSEncoderV1 {
    writeLeftID(id) {
        this.restEncoder.writeVarUint(id.client);
        this.restEncoder.writeVarUint(id.clock);
    }
    writeRightID(id) {
        this.restEncoder.writeVarUint(id.client);
        this.restEncoder.writeVarUint(id.clock);
    }
    /** Use writeClient and writeClock instead of writeID if possible. */
    writeClient(client) {
        this.restEncoder.writeVarUint(client);
    }
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeInfo(info) {
        this.restEncoder.writeUint8(info);
    }
    writeString(s) {
        this.restEncoder.writeVarString(s);
    }
    /**
     * @param {boolean} isYKey
     */
    writeParentInfo(isYKey) {
        this.restEncoder.writeVarUint(isYKey ? 1 : 0);
    }
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeTypeRef(info) {
        this.restEncoder.writeVarUint(info);
    }
    /**
     * Write len of a struct - well suited for Opt RLE encoder.
     *
     * @param {number} len
     */
    writeLen(len) {
        this.restEncoder.writeVarUint(len);
    }
    /**
     * @param {any} any
     */
    writeAny(any) {
        this.restEncoder.writeAny(any);
    }
    /**
     * @param {Uint8Array} buf
     */
    writeBuf(buf) {
        this.restEncoder.writeVarUint8Array(buf);
    }
    /**
     * @param {any} embed
     */
    writeJSON(embed) {
        this.restEncoder.writeVarString(JSON.stringify(embed));
    }
    /**
     * @param {string} key
     */
    writeKey(key) {
        this.restEncoder.writeVarString(key);
    }
}
exports.UpdateEncoderV1 = UpdateEncoderV1;
class DSEncoderV2 {
    constructor() {
        this.dsCurrVal = 0;
        this.restEncoder = new lib0.Encoder(); // encodes all the rest / non-optimized
    }
    toUint8Array() {
        return this.restEncoder.toUint8Array();
    }
    resetDsCurVal() {
        this.dsCurrVal = 0;
    }
    /**
     * @param {number} clock
     */
    writeDsClock(clock) {
        const diff = clock - this.dsCurrVal;
        this.dsCurrVal = clock;
        this.restEncoder.writeVarUint(diff);
    }
    /**
     * @param {number} len
     */
    writeDsLen(len) {
        if (len === 0) {
            throw new lib0.UnexpectedCaseError();
        }
        this.restEncoder.writeVarUint(len - 1);
        this.dsCurrVal += len;
    }
}
exports.DSEncoderV2 = DSEncoderV2;
class UpdateEncoderV2 extends DSEncoderV2 {
    constructor() {
        super();
        this.keyMap = new Map();
        this.keyClock = 0;
        this.keyClockEncoder = new lib0.IntDiffOptRleEncoder();
        this.clientEncoder = new lib0.UintOptRleEncoder();
        this.leftClockEncoder = new lib0.IntDiffOptRleEncoder();
        this.rightClockEncoder = new lib0.IntDiffOptRleEncoder();
        this.infoEncoder = new lib0.RleEncoder((encoder, value) => {
            encoder.write(value);
        });
        this.stringEncoder = new lib0.StringEncoder();
        this.parentInfoEncoder = new lib0.RleEncoder((encoder, value) => {
            encoder.write(value);
        });
        this.typeRefEncoder = new lib0.UintOptRleEncoder();
        this.lenEncoder = new lib0.UintOptRleEncoder();
    }
    toUint8Array() {
        const encoder = new lib0.Encoder();
        encoder.writeVarUint(0); // this is a feature flag that we might use in the future
        encoder.writeVarUint8Array(this.keyClockEncoder.toUint8Array());
        encoder.writeVarUint8Array(this.clientEncoder.toUint8Array());
        encoder.writeVarUint8Array(this.leftClockEncoder.toUint8Array());
        encoder.writeVarUint8Array(this.rightClockEncoder.toUint8Array());
        encoder.writeVarUint8Array(this.infoEncoder.encoder.toUint8Array());
        encoder.writeVarUint8Array(this.stringEncoder.toUint8Array());
        encoder.writeVarUint8Array(this.parentInfoEncoder.encoder.toUint8Array());
        encoder.writeVarUint8Array(this.typeRefEncoder.toUint8Array());
        encoder.writeVarUint8Array(this.lenEncoder.toUint8Array());
        // @note The rest encoder is appended! (note the missing var)
        encoder.writeUint8Array(this.restEncoder.toUint8Array());
        return encoder.toUint8Array();
    }
    writeLeftID(id) {
        this.clientEncoder.write(id.client);
        this.leftClockEncoder.write(id.clock);
    }
    writeRightID(id) {
        this.clientEncoder.write(id.client);
        this.rightClockEncoder.write(id.clock);
    }
    writeClient(client) {
        this.clientEncoder.write(client);
    }
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeInfo(info) {
        this.infoEncoder.write(info);
    }
    writeString(s) {
        this.stringEncoder.write(s);
    }
    writeParentInfo(isYKey) {
        this.parentInfoEncoder.write(isYKey ? 1 : 0);
    }
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeTypeRef(info) {
        this.typeRefEncoder.write(info);
    }
    /** Write len of a struct - well suited for Opt RLE encoder. */
    writeLen(len) {
        this.lenEncoder.write(len);
    }
    writeAny(any) {
        this.restEncoder.writeAny(any);
    }
    writeBuf(buf) {
        this.restEncoder.writeVarUint8Array(buf);
    }
    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    writeJSON(embed) {
        this.restEncoder.writeAny(embed);
    }
    /**
     * Property keys are often reused. For example, in y-prosemirror the key `bold` might
     * occur very often. For a 3d application, the key `position` might occur very often.
     *
     * We cache these keys in a Map and refer to them via a unique number.
     */
    writeKey(key) {
        const clock = this.keyMap.get(key);
        if (clock === undefined) {
            /**
             * @todo uncomment to introduce this feature finally
             *
             * Background. The ContentFormat object was always encoded using writeKey, but the decoder used to use readString.
             * Furthermore, I forgot to set the keyclock. So everything was working fine.
             *
             * However, this feature here is basically useless as it is not being used (it actually only consumes extra memory).
             *
             * I don't know yet how to reintroduce this feature..
             *
             * Older clients won't be able to read updates when we reintroduce this feature. So this should probably be done using a flag.
             *
             */
            // this.keyMap.set(key, this.keyClock)
            this.keyClockEncoder.write(this.keyClock++);
            this.stringEncoder.write(key);
        }
        else {
            this.keyClockEncoder.write(clock);
        }
    }
}
exports.UpdateEncoderV2 = UpdateEncoderV2;
