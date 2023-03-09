
import {
    AbstractStruct,
    addStruct,
    UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction, ID // eslint-disable-line
} from 'yjs/dist/src/internals'

export const structGCRefNumber = 0

/**
 * @private
 */
export class GC extends AbstractStruct {
    get deleted () { return true }

    delete() {}

    mergeWith(right: GC): boolean {
        if (this.constructor !== right.constructor) {
            return false
        }
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

    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number) {
        encoder.writeInfo(structGCRefNumber)
        encoder.writeLen(this.length - offset)
    }

    getMissing (transaction: Transaction, store: StructStore): number | null {
        return null
    }
}
