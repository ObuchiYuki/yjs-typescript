import {
    UpdateEncoderV1, UpdateEncoderV2, UpdateDecoderV1, UpdateDecoderV2, Transaction, Item, StructStore 
} from '../internals'

export class ContentAny {
    constructor(
        public arr: any[]
    ) {}


    getLength(): number {
        return this.arr.length
    }

    getContent(): any[] {
        return this.arr
    }

    isCountable(): boolean {
        return true
    }

    copy(): ContentAny {
        return new ContentAny(this.arr)
    }

    splice(offset: number): ContentAny {
        const right = new ContentAny(this.arr.slice(offset))
        this.arr = this.arr.slice(0, offset)
        return right
    }

    mergeWith(right: ContentAny): boolean {
        this.arr = this.arr.concat(right.arr)
        return true
    }

    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number) {
        const len = this.arr.length
        encoder.writeLen(len - offset)
        for (let i = offset; i < len; i++) {
            const c = this.arr[i]
            encoder.writeAny(c)
        }
    }

    getRef(): number {
        return 8
    }
}

export const readContentAny = (decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentAny => {
    const len = decoder.readLen()
    const cs = []
    for (let i = 0; i < len; i++) {
        cs.push(decoder.readAny())
    }
    return new ContentAny(cs)
}
