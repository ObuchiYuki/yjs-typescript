
import {
    StructStore, Transaction, ID, AbstractStruct_, UpdateEncoderAny
} from '../internals'

import * as error from 'lib0/error'
import * as encoding from 'lib0/encoding'

export const structSkipRefNumber = 10

export class Skip implements AbstractStruct_ {
    constructor(
        public id: ID,
        public length: number
    ) {}

    get deleted(): boolean { return true }

    delete () {}

    mergeWith(right: Skip): boolean {
        if (this.constructor !== right.constructor) { return false }
        this.length += right.length
        return true
    }

    integrate(transaction: Transaction, offset: number) {
        // skip structs cannot be integrated
        error.unexpectedCase()
    }

    write(encoder: UpdateEncoderAny, offset: number) {
        encoder.writeInfo(structSkipRefNumber)
        // write as VarUint because Skips can't make use of predictable length-encoding
        encoding.writeVarUint(encoder.restEncoder, this.length - offset)
    }

    getMissing(transaction: Transaction, store: StructStore): null | number {
        return null
    }
}
