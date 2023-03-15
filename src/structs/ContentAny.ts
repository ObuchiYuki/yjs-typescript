import {
    UpdateEncoderAny_, UpdateDecoderAny_, Transaction, Item, StructStore, 
    YContent, YContentDecoder
} from '../internals'

export class ContentAny implements YContent {
    constructor(public array: any[]) {}

    getLength(): number { return this.array.length }

    getContent(): any[] { return this.array }

    isCountable(): boolean { return true }

    copy(): ContentAny { return new ContentAny(this.array) }

    splice(offset: number): ContentAny {
        const right = new ContentAny(this.array.slice(offset))
        this.array = this.array.slice(0, offset)
        return right
    }

    mergeWith(right: ContentAny): boolean {
        this.array = this.array.concat(right.array)
        return true
    }

    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderAny_, offset: number) {
        const len = this.array.length
        encoder.writeLen(len - offset)
        for (let i = offset; i < len; i++) {
            const c = this.array[i]
            encoder.writeAny(c)
        }
    }

    getRef(): number { return 8 }
}

export const readContentAny: YContentDecoder = decoder => {
    const len = decoder.readLen()
    const cs = []
    for (let i = 0; i < len; i++) {
        cs.push(decoder.readAny())
    }
    return new ContentAny(cs)
}
