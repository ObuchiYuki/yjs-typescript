
import * as lib0 from 'lib0-typescript'

export class ID {
    /** Client id */
    client: number
    /** unique per client id, continuous number */
    clock: number

    constructor(client: number, clock: number) {
        this.client = client
        this.clock = clock
    }

    encode(encoder: lib0.Encoder) {
        encoder.writeVarUint(this.client)
        encoder.writeVarUint(this.clock)
    }

    static decode(decoder: lib0.Decoder): ID {
        return new ID(decoder.readVarUint(), decoder.readVarUint())
    }
}

export const compareIDs = (a: ID | null, b: ID | null): boolean => {
    return a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock)
}

