import { Struct_ } from "./Struct_"

import {
    addStruct,
    StructStore, Transaction, UpdateEncoderAny_, ID,
} from '../internals'

export const structGCRefNumber = 0

export class GC extends Struct_ {
    get deleted () { return true }

    delete() {}

    mergeWith(right: GC): boolean {
        if (this.constructor !== right.constructor) { return false }
        this.length += right.length
        return true
    }

    integrate(transaction: Transaction, offset: number) {
        if (offset > 0) {
            this.id.clock += offset
            this.length -= offset
        }
        addStruct(transaction.doc.store, this)
    }

    write(encoder: UpdateEncoderAny_, offset: number) {
        encoder.writeInfo(structGCRefNumber)
        encoder.writeLen(this.length - offset)
    }

    getMissing(transaction: Transaction, store: StructStore): number | null {
        return null
    }
}
