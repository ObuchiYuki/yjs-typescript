import { Struct_ } from "./Struct_"

import {
    StructStore, Transaction, ID,
    UpdateEncoderAny_
} from '../internals'

import * as lib0 from "lib0-typescript"

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
        throw new lib0.UnexpectedCaseError()
    }

    write(encoder: UpdateEncoderAny_, offset: number) {
        encoder.writeInfo(structSkipRefNumber)
        // write as VarUint because Skips can't make use of predictable length-encoding
        encoder.restEncoder.writeVarUint(this.length - offset)
    }

    getMissing(transaction: Transaction, store: StructStore): null | number {
        return null
    }
}
