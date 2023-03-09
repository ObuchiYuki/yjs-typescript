import {
    UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Item, Transaction // eslint-disable-line
} from 'yjs/dist/src/internals'

import * as error from 'lib0/error'

export class ContentBinary {
    constructor (
        public content: Uint8Array
    ) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.content] }

    isCountable(): boolean { return true }

    copy(): ContentBinary { return new ContentBinary(this.content) }

    splice(offset: number): ContentBinary {
        throw error.methodUnimplemented()
    }

    mergeWith(right: ContentBinary): boolean {
        return false
    }
    
    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number) {
        encoder.writeBuf(this.content)
    }

    getRef(): number { return 3 }
}

export const readContentBinary = (decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentBinary => {
    return new ContentBinary(decoder.readBuf())
}
