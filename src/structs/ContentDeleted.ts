
import {
    addToDeleteSet,
    UpdateEncoderAny, StructStore, Item, Transaction,
    AbstractContent_, AbstractContentDecoder_
} from '../internals'

export class ContentDeleted implements AbstractContent_ {
    constructor(public len: number) {}

    getLength(): number { return this.len }

    getContent(): any[] { return [] }

    isCountable(): boolean { return false }

    copy(): ContentDeleted { return new ContentDeleted(this.len) }

    splice(offset: number): ContentDeleted {
        const right = new ContentDeleted(this.len - offset)
        this.len = offset
        return right
    }

    mergeWith(right: ContentDeleted): boolean {
        this.len += right.len
        return true
    }

    integrate(transaction: Transaction, item: Item) {
        addToDeleteSet(transaction.deleteSet, item.id.client, item.id.clock, this.len)
        item.markDeleted()
    }

    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderAny, offset: number) { encoder.writeLen(this.len - offset) }

    getRef(): number { return 1 }
}

export const readContentDeleted: AbstractContentDecoder_ = decoder => {
    return new ContentDeleted(decoder.readLen())
}
