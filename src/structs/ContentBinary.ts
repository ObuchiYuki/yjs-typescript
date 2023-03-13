import {
    UpdateEncoderAny_, UpdateDecoderAny_, StructStore, Item, Transaction,
    Content_, ContentDecoder_

} from '../internals'

import * as error from 'lib0/error'

export class ContentBinary implements Content_ {
    constructor (public content: Uint8Array) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.content] }

    isCountable(): boolean { return true }

    copy(): ContentBinary { return new ContentBinary(this.content) }

    splice(offset: number): ContentBinary { throw error.methodUnimplemented() }

    mergeWith(right: ContentBinary): boolean { return false }
    
    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderAny_, offset: number) { encoder.writeBuf(this.content) }

    getRef(): number { return 3 }
}

export const readContentBinary: ContentDecoder_ = decoder => {
    return new ContentBinary(decoder.readBuf())
}
