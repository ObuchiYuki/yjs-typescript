import * as encoding from 'lib0/encoding';
import { ID } from '../internals';
export declare class DSEncoderV1 {
    restEncoder: encoding.Encoder;
    constructor();
    toUint8Array(): Uint8Array;
    resetDsCurVal(): void;
    writeDsClock(clock: number): void;
    writeDsLen(len: number): void;
}
export declare class UpdateEncoderV1 extends DSEncoderV1 {
    writeLeftID(id: ID): void;
    writeRightID(id: ID): void;
    /** Use writeClient and writeClock instead of writeID if possible. */
    writeClient(client: number): void;
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeInfo(info: number): void;
    writeString(s: string): void;
    /**
     * @param {boolean} isYKey
     */
    writeParentInfo(isYKey: boolean): void;
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeTypeRef(info: number): void;
    /**
     * Write len of a struct - well suited for Opt RLE encoder.
     *
     * @param {number} len
     */
    writeLen(len: number): void;
    /**
     * @param {any} any
     */
    writeAny(any: any): void;
    /**
     * @param {Uint8Array} buf
     */
    writeBuf(buf: Uint8Array): void;
    /**
     * @param {any} embed
     */
    writeJSON(embed: any): void;
    /**
     * @param {string} key
     */
    writeKey(key: string): void;
}
export declare class DSEncoderV2 {
    restEncoder: encoding.Encoder;
    dsCurrVal: number;
    constructor();
    toUint8Array(): Uint8Array;
    resetDsCurVal(): void;
    /**
     * @param {number} clock
     */
    writeDsClock(clock: number): void;
    /**
     * @param {number} len
     */
    writeDsLen(len: number): void;
}
export declare class UpdateEncoderV2 extends DSEncoderV2 {
    keyMap: Map<string, number>;
    /** Refers to the next uniqe key-identifier to me used. See writeKey method for more information. */
    keyClock: number;
    keyClockEncoder: encoding.IntDiffOptRleEncoder;
    clientEncoder: encoding.UintOptRleEncoder;
    leftClockEncoder: encoding.UintOptRleEncoder;
    rightClockEncoder: encoding.UintOptRleEncoder;
    infoEncoder: encoding.RleEncoder<number>;
    stringEncoder: encoding.StringEncoder;
    parentInfoEncoder: encoding.RleEncoder<number>;
    typeRefEncoder: encoding.UintOptRleEncoder;
    lenEncoder: encoding.UintOptRleEncoder;
    constructor();
    toUint8Array(): Uint8Array;
    writeLeftID(id: ID): void;
    writeRightID(id: ID): void;
    writeClient(client: number): void;
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeInfo(info: number): void;
    writeString(s: string): void;
    writeParentInfo(isYKey: boolean): void;
    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeTypeRef(info: number): void;
    /** Write len of a struct - well suited for Opt RLE encoder. */
    writeLen(len: number): void;
    writeAny(any: any): void;
    writeBuf(buf: Uint8Array): void;
    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    writeJSON(embed: any): void;
    /**
     * Property keys are often reused. For example, in y-prosemirror the key `bold` might
     * occur very often. For a 3d application, the key `position` might occur very often.
     *
     * We cache these keys in a Map and refer to them via a unique number.
     */
    writeKey(key: string): void;
}
export type UpdateEncoderAny = UpdateEncoderV1 | UpdateEncoderV2;
