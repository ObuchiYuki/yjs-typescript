
import {
    UpdateEncoderAny_, StructStore, Item, Transaction,
    Content_, ContentDecoder_
} from '../internals'

import * as error from 'lib0/error'

export class ContentEmbed implements Content_ {
    constructor(public embed: object) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.embed] }

    isCountable(): boolean { return true }

    copy(): ContentEmbed { return new ContentEmbed(this.embed) }

    splice(offset: number): ContentEmbed { throw error.methodUnimplemented() }

    mergeWith(right: ContentEmbed): boolean { return false }

    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}

    write (encoder: UpdateEncoderAny_, offset: number) { encoder.writeJSON(this.embed) }

    getRef(): number { return 5 }
}

export const readContentEmbed: ContentDecoder_ = decoder => {
    return new ContentEmbed(decoder.readJSON())
}
