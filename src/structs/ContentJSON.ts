import {
    UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Transaction, Item, StructStore // eslint-disable-line
} from '../internals'

/**
 * @private
 */
export class ContentJSON {
    constructor(
        public arr: any[]
    ) {}

    getLength(): number { return this.arr.length }

    getContent(): any[] { return this.arr }

    isCountable(): boolean { return true }

    copy(): ContentJSON { return new ContentJSON(this.arr) }

    splice(offset: number): ContentJSON {
        const right = new ContentJSON(this.arr.slice(offset))
        this.arr = this.arr.slice(0, offset)
        return right
    }

    mergeWith(right: ContentJSON): boolean {
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
            encoder.writeString(c === undefined ? 'undefined' : JSON.stringify(c))
        }
    }

    getRef(): number { return 2 }
}

export const readContentJSON = (decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentJSON => {
    const len = decoder.readLen()
    const cs = []
    for (let i = 0; i < len; i++) {
        const c = decoder.readString()
        if (c === 'undefined') {
            cs.push(undefined)
        } else {
            cs.push(JSON.parse(c))
        }
    }
    return new ContentJSON(cs)
}
