
import {
    UpdateEncoderAny_, StructStore, Item, Transaction,
    YContent, YContentDecoder
} from '../internals'

export class ContentDeleted implements YContent {
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
        transaction.deleteSet.add(item.id.client, item.id.clock, this.len)
        item.markDeleted()
    }

    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderAny_, offset: number) { encoder.writeLen(this.len - offset) }

    getRef(): number { return 1 }
}

export const readContentDeleted: YContentDecoder = decoder => {
    return new ContentDeleted(decoder.readLen())
}
