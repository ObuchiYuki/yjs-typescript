import { ID } from '../internals'
import * as lib0 from 'lib0-typescript'

export class DSDecoderV1 {
    restDecoder: lib0.Decoder

    constructor(decoder: lib0.Decoder) {
        this.restDecoder = decoder
    }

    resetDsCurVal () {}

    readDsClock(): number {
        return this.restDecoder.readVarUint()
    }

    readDsLen(): number {
        return this.restDecoder.readVarUint()
    }
}

export class UpdateDecoderV1 extends DSDecoderV1 {
    readLeftID(): ID {
        return new ID(this.restDecoder.readVarUint(), this.restDecoder.readVarUint())
    }

    readRightID(): ID {
        return new ID(this.restDecoder.readVarUint(), this.restDecoder.readVarUint())
    }

    /**
     * Read the next client id.
     * Use this in favor of readID whenever possible to reduce the number of objects created.
     */
    readClient(): number {
        return this.restDecoder.readVarUint()
    }

    /**
     * @return {number} info An unsigned 8-bit integer
     */
    readInfo(): number {
        return this.restDecoder.readUint8()
    }

    readString(): string {
        return this.restDecoder.readVarString()
    }

    readParentInfo(): boolean {
        return this.restDecoder.readVarUint() === 1
    }

    readTypeRef(): number {
        return this.restDecoder.readVarUint()
    }

    /** Write len of a struct - well suited for Opt RLE encoder. */
    readLen(): number {
        return this.restDecoder.readVarUint()
    }

    readAny(): any {
        return this.restDecoder.readAny()
    }

    readBuf(): Uint8Array {
        return this.restDecoder.readVarUint8Array()
    }

    /** Legacy implementation uses JSON parse. We use any-lib0 in v2. */
    readJSON(): any {
        return JSON.parse(this.restDecoder.readVarString())
    }

    readKey(): string {
        return this.restDecoder.readVarString()
    }
}

export class DSDecoderV2 {
    dsCurrVal: number = 0
    restDecoder: lib0.Decoder

    constructor (decoder: lib0.Decoder) {
        this.restDecoder = decoder
    }

    resetDsCurVal () {
        this.dsCurrVal = 0
    }

    readDsClock(): number {
        this.dsCurrVal += this.restDecoder.readVarUint()
        return this.dsCurrVal
    }

    readDsLen(): number {
        const diff = this.restDecoder.readVarUint() + 1
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
    keyClockDecoder: lib0.IntDiffOptRleDecoder
    clientDecoder: lib0.UintOptRleDecoder
    leftClockDecoder: lib0.IntDiffOptRleDecoder
    rightClockDecoder: lib0.IntDiffOptRleDecoder
    infoDecoder: lib0.RleDecoder<number>
    stringDecoder: lib0.StringDecoder
    parentInfoDecoder: lib0.RleDecoder<number>
    typeRefDecoder: lib0.UintOptRleDecoder
    lenDecoder: lib0.UintOptRleDecoder

    constructor(decoder: lib0.Decoder) {
        super(decoder)

        decoder.readVarUint() // read feature flag - currently unused
        this.keyClockDecoder = new lib0.IntDiffOptRleDecoder(decoder.readVarUint8Array())
        this.clientDecoder = new lib0.UintOptRleDecoder(decoder.readVarUint8Array())
        this.leftClockDecoder = new lib0.IntDiffOptRleDecoder(decoder.readVarUint8Array())
        this.rightClockDecoder = new lib0.IntDiffOptRleDecoder(decoder.readVarUint8Array())
        this.infoDecoder = new lib0.RleDecoder(decoder.readVarUint8Array(), decoder => decoder.readUint8())
        this.stringDecoder = new lib0.StringDecoder(decoder.readVarUint8Array())
        this.parentInfoDecoder = new lib0.RleDecoder(decoder.readVarUint8Array(), decoder => decoder.readUint8())
        this.typeRefDecoder = new lib0.UintOptRleDecoder(decoder.readVarUint8Array())
        this.lenDecoder = new lib0.UintOptRleDecoder(decoder.readVarUint8Array())
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
        return this.infoDecoder.read()
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
        return this.restDecoder.readAny()
    }

    readBuf(): Uint8Array {
        return this.restDecoder.readVarUint8Array()
    }

    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    readJSON(): any {
        return this.restDecoder.readAny()
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

export type UpdateDecoderAny_ = UpdateDecoderV1 | UpdateDecoderV2