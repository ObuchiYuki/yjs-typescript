
import {
    UpdateEncoderAny_, StructStore, Item, Transaction,
    Content_, ContentDecoder_, AbstractType_
} from '../internals'

import * as lib0 from "lib0-typescript"

export class ContentFormat implements Content_ {
    constructor(
        public key: string,
        public value: object
    ) {}

    getLength(): number { return 1 }
    
    getContent(): any[] { return [] }

    isCountable(): boolean { return false }

    copy(): ContentFormat { return new ContentFormat(this.key, this.value) }

    splice(offset: number): ContentFormat { throw new lib0.UnimplementedMethodError() }

    mergeWith(right: ContentFormat): boolean { return false }

    integrate(transaction: Transaction, item: Item) {
        // @todo searchmarker are currently unsupported for rich text documents
        (item.parent as AbstractType_<any>)._searchMarker = null
    }

    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write(encoder: UpdateEncoderAny_, offset: number) {
        encoder.writeKey(this.key)
        encoder.writeJSON(this.value)
    }

    getRef(): number { return 6 }
}

export const readContentFormat: ContentDecoder_ = decoder => {
    return new ContentFormat(decoder.readKey(), decoder.readJSON())
}
