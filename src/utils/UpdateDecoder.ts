import * as buffer from 'lib0/buffer'
import * as decoding from 'lib0/decoding'
import {
    ID, createID
} from '../internals'

export class DSDecoderV1 {
    restDecoder: decoding.Decoder

    constructor(decoder: decoding.Decoder) {
        this.restDecoder = decoder
    }

    resetDsCurVal () {}

    readDsClock(): number {
        return decoding.readVarUint(this.restDecoder)
    }

    readDsLen(): number {
        return decoding.readVarUint(this.restDecoder)
    }
}

export class UpdateDecoderV1 extends DSDecoderV1 {
    readLeftID(): ID {
        return createID(decoding.readVarUint(this.restDecoder), decoding.readVarUint(this.restDecoder))
    }

    readRightID(): ID {
        return createID(decoding.readVarUint(this.restDecoder), decoding.readVarUint(this.restDecoder))
    }

    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient(): number {
        return decoding.readVarUint(this.restDecoder)
    }

    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo(): number {
        return decoding.readUint8(this.restDecoder)
    }

    readString(): string {
        return decoding.readVarString(this.restDecoder)
    }

    readParentInfo(): boolean {
        return decoding.readVarUint(this.restDecoder) === 1
    }

    readTypeRef(): number {
        return decoding.readVarUint(this.restDecoder)
    }

    /** Write len of a struct - well suited for Opt RLE encoder. */
    readLen(): number {
        return decoding.readVarUint(this.restDecoder)
    }

    readAny(): any {
        return decoding.readAny(this.restDecoder)
    }

    readBuf(): Uint8Array {
        return buffer.copyUint8Array(decoding.readVarUint8Array(this.restDecoder))
    }

    /** Legacy implementation uses JSON parse. We use any-decoding in v2. */
    readJSON(): any {
        return JSON.parse(decoding.readVarString(this.restDecoder))
    }

    readKey(): string {
        return decoding.readVarString(this.restDecoder)
    }
}

export class DSDecoderV2 {
    dsCurrVal: number = 0
    restDecoder: decoding.Decoder

    constructor (decoder: decoding.Decoder) {
        this.restDecoder = decoder
    }

    resetDsCurVal () {
        this.dsCurrVal = 0
    }

    readDsClock(): number {
        this.dsCurrVal += decoding.readVarUint(this.restDecoder)
        return this.dsCurrVal
    }

    readDsLen(): number {
        const diff = decoding.readVarUint(this.restDecoder) + 1
        this.dsCurrVal += diff
        return diff
    }
}

export class UpdateDecoderV2 extends DSDecoderV2 {
    /**
     * List of cached keys. If the keys[id] does not exist, we read a new key
     * from stringEncoder and push it to keys. 
     */
    keys: string[] = []
    keyClockDecoder: decoding.IntDiffOptRleDecoder
    clientDecoder: decoding.UintOptRleDecoder
    leftClockDecoder: decoding.IntDiffOptRleDecoder
    rightClockDecoder: decoding.IntDiffOptRleDecoder
    infoDecoder: decoding.RleDecoder<number>
    stringDecoder: decoding.StringDecoder
    parentInfoDecoder: decoding.RleDecoder<number>
    typeRefDecoder: decoding.UintOptRleDecoder
    lenDecoder: decoding.UintOptRleDecoder

    constructor(decoder: decoding.Decoder) {
        super(decoder)

        decoding.readVarUint(decoder) // read feature flag - currently unused
        this.keyClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder))
        this.clientDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder))
        this.leftClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder))
        this.rightClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder))
        this.infoDecoder = new decoding.RleDecoder(decoding.readVarUint8Array(decoder), decoding.readUint8)
        this.stringDecoder = new decoding.StringDecoder(decoding.readVarUint8Array(decoder))
        this.parentInfoDecoder = new decoding.RleDecoder(decoding.readVarUint8Array(decoder), decoding.readUint8)
        this.typeRefDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder))
        this.lenDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder))
    }

    readLeftID(): ID {
        return new ID(this.clientDecoder.read(), this.leftClockDecoder.read())
    }

    readRightID(): ID {
        return new ID(this.clientDecoder.read(), this.rightClockDecoder.read())
    }

    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient() {
        return this.clientDecoder.read()
    }

    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo(): number {
        return /** @type {number} */ (this.infoDecoder.read())
    }

    readString(): string {
        return this.stringDecoder.read()
    }

    readParentInfo(): boolean {
        return this.parentInfoDecoder.read() === 1
    }

    /**
     * @return {number} An unsigned 8-bit integer
     */
    readTypeRef(): number {
        return this.typeRefDecoder.read()
    }

    /**
     * Write len of a struct - well suited for Opt RLE encoder.
     */
    readLen(): number {
        return this.lenDecoder.read()
    }

    readAny(): any {
        return decoding.readAny(this.restDecoder)
    }

    readBuf(): Uint8Array {
        return decoding.readVarUint8Array(this.restDecoder)
    }

    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    readJSON(): any {
        return decoding.readAny(this.restDecoder)
    }

    readKey(): string {
        const keyClock = this.keyClockDecoder.read()
        if (keyClock < this.keys.length) {
            return this.keys[keyClock]
        } else {
            const key = this.stringDecoder.read()
            this.keys.push(key)
            return key
        }
    }
}

export type UpdateDecoderAny = UpdateDecoderV1 | UpdateDecoderV2