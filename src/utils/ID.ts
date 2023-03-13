
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'

export class ID {
    /** Client id */
    client: number
    /** unique per client id, continuous number */
    clock: number

    constructor(client: number, clock: number) {
        this.client = client
        this.clock = clock
    }

    encode(encoder: encoding.Encoder) {
        encoding.writeVarUint(encoder, this.client)
        encoding.writeVarUint(encoder, this.clock)
    }

    static decode(decoder: decoding.Decoder): ID {
        return new ID(
            decoding.readVarUint(decoder),
            decoding.readVarUint(decoder)
        )
    }
}

export const compareIDs = (a: ID | null, b: ID | null): boolean => {
    return a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock)
}

