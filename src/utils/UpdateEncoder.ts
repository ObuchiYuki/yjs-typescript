
import * as lib0 from 'lib0-typescript'

import { ID } from '../internals'

export class DSEncoderV1 {
    restEncoder: lib0.Encoder

    constructor() {
        this.restEncoder = new lib0.Encoder()
    }

    toUint8Array () {
        return this.restEncoder.toUint8Array()
    }

    resetDsCurVal () {
        // nop
    }

    writeDsClock(clock: number) {
        this.restEncoder.writeVarUint(clock)
    }

    writeDsLen(len: number) {
        this.restEncoder.writeVarUint(len)
    }
}

export class UpdateEncoderV1 extends DSEncoderV1 {
    writeLeftID(id: ID) {
        this.restEncoder.writeVarUint(id.client)
        this.restEncoder.writeVarUint(id.clock)
    }

    writeRightID(id: ID) {
        this.restEncoder.writeVarUint(id.client)
        this.restEncoder.writeVarUint(id.clock)
    }

    /** Use writeClient and writeClock instead of writeID if possible. */
    writeClient(client: number) {
        this.restEncoder.writeVarUint(client)
    }

    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeInfo(info: number) {
        this.restEncoder.writeUint8(info)
    }

    writeString(s: string) {
        this.restEncoder.writeVarString(s)
    }

    /**
     * @param {boolean} isYKey
     */
    writeParentInfo(isYKey: boolean) {
        this.restEncoder.writeVarUint(isYKey ? 1 : 0)
    }

    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeTypeRef(info: number) {
        this.restEncoder.writeVarUint(info)
    }

    /**
     * Write len of a struct - well suited for Opt RLE encoder.
     *
     * @param {number} len
     */
    writeLen(len: number) {
        this.restEncoder.writeVarUint(len)
    }

    /**
     * @param {any} any
     */
    writeAny(any: any) {
        this.restEncoder.writeAny(any)
    }

    /**
     * @param {Uint8Array} buf
     */
    writeBuf(buf: Uint8Array) {
        this.restEncoder.writeVarUint8Array(buf)
    }

    /**
     * @param {any} embed
     */
    writeJSON(embed: any) {
        this.restEncoder.writeVarString(JSON.stringify(embed))
    }

    /**
     * @param {string} key
     */
    writeKey(key: string) {
        this.restEncoder.writeVarString(key)
    }
}

export class DSEncoderV2 {
    restEncoder: lib0.Encoder
    dsCurrVal: number = 0

    constructor () {
        this.restEncoder = new lib0.Encoder() // encodes all the rest / non-optimized
    }

    toUint8Array() {
        return this.restEncoder.toUint8Array()
    }

    resetDsCurVal() {
        this.dsCurrVal = 0
    }

    /**
     * @param {number} clock
     */
    writeDsClock(clock: number) {
        const diff = clock - this.dsCurrVal
        this.dsCurrVal = clock
        this.restEncoder.writeVarUint(diff)
    }

    /**
     * @param {number} len
     */
    writeDsLen(len: number) {
        if (len === 0) {
            throw new lib0.UnexpectedCaseError()
        }
        this.restEncoder.writeVarUint(len - 1)
        this.dsCurrVal += len
    }
}

export class UpdateEncoderV2 extends DSEncoderV2 {
    keyMap: Map<string, number>
    
    /** Refers to the next uniqe key-identifier to me used. See writeKey method for more information. */    
    keyClock: number

    keyClockEncoder: lib0.IntDiffOptRleEncoder
    clientEncoder: lib0.UintOptRleEncoder
    leftClockEncoder: lib0.UintOptRleEncoder
    rightClockEncoder: lib0.UintOptRleEncoder
    infoEncoder: lib0.RleEncoder<number>
    stringEncoder: lib0.StringEncoder
    parentInfoEncoder: lib0.RleEncoder<number>
    typeRefEncoder: lib0.UintOptRleEncoder
    lenEncoder: lib0.UintOptRleEncoder

    constructor () {
        super()
        this.keyMap = new Map<string, number>()
        this.keyClock = 0
        this.keyClockEncoder = new lib0.IntDiffOptRleEncoder()
        this.clientEncoder = new lib0.UintOptRleEncoder()
        this.leftClockEncoder = new lib0.IntDiffOptRleEncoder()
        this.rightClockEncoder = new lib0.IntDiffOptRleEncoder()
        this.infoEncoder = new lib0.RleEncoder((encoder, value) => {
            encoder.write(value)
        })
        this.stringEncoder = new lib0.StringEncoder()
        this.parentInfoEncoder = new lib0.RleEncoder((encoder, value) => {
            encoder.write(value)
        })
        this.typeRefEncoder = new lib0.UintOptRleEncoder()
        this.lenEncoder = new lib0.UintOptRleEncoder()
    }

    toUint8Array() {
        const encoder = new lib0.Encoder()
        encoder.writeVarUint(0) // this is a feature flag that we might use in the future
        encoder.writeVarUint8Array(this.keyClockEncoder.toUint8Array())

        encoder.writeVarUint8Array(this.clientEncoder.toUint8Array())
        encoder.writeVarUint8Array(this.leftClockEncoder.toUint8Array())
        encoder.writeVarUint8Array(this.rightClockEncoder.toUint8Array())
        encoder.writeVarUint8Array(this.infoEncoder.encoder.toUint8Array())        
        encoder.writeVarUint8Array(this.stringEncoder.toUint8Array())
        encoder.writeVarUint8Array(this.parentInfoEncoder.encoder.toUint8Array())
        encoder.writeVarUint8Array(this.typeRefEncoder.toUint8Array())
        encoder.writeVarUint8Array(this.lenEncoder.toUint8Array())
        encoder.writeUint8Array(this.restEncoder.toUint8Array())
        
        return encoder.toUint8Array()
    }

    writeLeftID(id: ID) {
        this.clientEncoder.write(id.client)
        this.leftClockEncoder.write(id.clock)
    }

    writeRightID(id: ID) {
        this.clientEncoder.write(id.client)
        this.rightClockEncoder.write(id.clock)
    }

    writeClient(client: number) {
        this.clientEncoder.write(client)
    }

    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeInfo(info: number) {
        this.infoEncoder.write(info)
    }

    writeString(s: string) {
        this.stringEncoder.write(s)
    }

    writeParentInfo(isYKey: boolean) {
        this.parentInfoEncoder.write(isYKey ? 1 : 0)
    }

    /**
     * @param {number} info An unsigned 8-bit integer
     */
    writeTypeRef(info: number) {
        this.typeRefEncoder.write(info)
    }

    /** Write len of a struct - well suited for Opt RLE encoder. */
    writeLen(len: number) {
        this.lenEncoder.write(len)
    }

    writeAny(any: any) {
        this.restEncoder.writeAny(any)
    }

    writeBuf(buf: Uint8Array) {
        this.restEncoder.writeVarUint8Array(buf)
    }

    /**
     * This is mainly here for legacy purposes.
     *
     * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
     */
    writeJSON(embed: any) {
        this.restEncoder.writeAny(embed)
    }

    /**
     * Property keys are often reused. For example, in y-prosemirror the key `bold` might
     * occur very often. For a 3d application, the key `position` might occur very often.
     *
     * We cache these keys in a Map and refer to them via a unique number.
     */
    writeKey(key: string) {
        const clock = this.keyMap.get(key)
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
            this.keyClockEncoder.write(this.keyClock++)
            this.stringEncoder.write(key)
        } else {
            this.keyClockEncoder.write(clock)
        }
    }
}

export type UpdateEncoderAny_ = UpdateEncoderV1 | UpdateEncoderV2