import { Struct_ } from "./Struct_"

import {
    StructStore, Transaction, ID,
    UpdateEncoderAny_
} from '../internals'

import * as error from 'lib0/error'
import * as encoding from 'lib0/encoding'

export const structSkipRefNumber = 10

export class Skip extends Struct_ {
    
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

    write(encoder: UpdateEncoderAny_, offset: number) {
        encoder.writeInfo(structSkipRefNumber)
        // write as VarUint because Skips can't make use of predictable length-encoding
        encoding.writeVarUint(encoder.restEncoder, this.length - offset)
    }

    getMissing(transaction: Transaction, store: StructStore): null | number {
        return null
    }
}
