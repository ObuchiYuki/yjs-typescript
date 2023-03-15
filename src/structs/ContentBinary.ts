import {
    UpdateEncoderAny_, UpdateDecoderAny_, StructStore, Item, Transaction,
    YContent, YContentDecoder

} from '../internals'

import * as lib0 from "lib0-typescript"


export class ContentBinary implements YContent {
    constructor (public content: Uint8Array) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.content] }

    isCountable(): boolean { return true }

    copy(): ContentBinary { return new ContentBinary(this.content) }

    splice(offset: number): ContentBinary { throw new lib0.UnimplementedMethodError() }

    mergeWith(right: ContentBinary): boolean { return false }
    
    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderAny_, offset: number) { encoder.writeBuf(this.content) }

    getRef(): number { return 3 }
}

export const readContentBinary: YContentDecoder = decoder => {
    return new ContentBinary(decoder.readBuf())
}
