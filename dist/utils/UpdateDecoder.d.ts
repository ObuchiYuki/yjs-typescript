import { ID } from '../internals';
import * as lib0 from 'lib0-typescript';
export declare class DSDecoderV1 {
    restDecoder: lib0.Decoder;
    constructor(decoder: lib0.Decoder);
    resetDsCurVal(): void;
    readDsClock(): number;
    readDsLen(): number;
}
export declare class UpdateDecoderV1 extends DSDecoderV1 {
    readLeftID(): ID;
    readRightID(): ID;
    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient(): number;
    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo(): number;
    readString(): string;
    readParentInfo(): boolean;
    readTypeRef(): number;
    /** Write len of a struct - well suited for Opt RLE encoder. */
    readLen(): number;
    readAny(): any;
    readBuf(): Uint8Array;
    /** Legacy implementation uses JSON parse. We use any-lib0 in v2. */
    readJSON(): any;
    readKey(): string;
}
export declare class DSDecoderV2 {
    dsCurrVal: number;
    restDecoder: lib0.Decoder;
    constructor(decoder: lib0.Decoder);
    resetDsCurVal(): void;
    readDsClock(): number;
    readDsLen(): number;
}
export declare class UpdateDecoderV2 extends DSDecoderV2 {
    /**
     * List of cached keys. If the keys[id] does not exist, we read a new key
     * from stringEncoder and push it to keys.
     */
    keys: string[];
    keyClockDecoder: lib0.IntDiffOptRleDecoder;
    clientDecoder: lib0.UintOptRleDecoder;
    leftClockDecoder: lib0.IntDiffOptRleDecoder;
    rightClockDecoder: lib0.IntDiffOptRleDecoder;
    infoDecoder: lib0.RleDecoder<number>;
    stringDecoder: lib0.StringDecoder;
    parentInfoDecoder: lib0.RleDecoder<number>;
    typeRefDecoder: lib0.UintOptRleDecoder;
    lenDecoder: lib0.UintOptRleDecoder;
    constructor(decoder: lib0.Decoder);
    readLeftID(): ID;
    readRightID(): ID;
    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient(): number;
    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo(): number;
    readString(): string;
    readParentInfo(): boolean;
    /**
     * @return {number} An unsigned 8-bit integer
     */
    readTypeRef(): number;
    /**
     * Write len of a struct - well suited for Opt RLE encoder.
     */
    readLen(): number;
    readAny(): any;
    readBuf(): Uint8Array;
    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    readJSON(): any;
    readKey(): string;
}
export type UpdateDecoderAny_ = UpdateDecoderV1 | UpdateDecoderV2;
