
import {
    UpdateEncoderAny_, StructStore, Item, Transaction,
    YContent, YContentDecoder
} from '../internals'

import * as lib0 from "lib0-typescript"

export class ContentEmbed implements YContent {
    constructor(public embed: object) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.embed] }

    isCountable(): boolean { return true }

    copy(): ContentEmbed { return new ContentEmbed(this.embed) }

    splice(offset: number): ContentEmbed { throw new lib0.UnimplementedMethodError() }

    mergeWith(right: ContentEmbed): boolean { return false }

    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}

    write(encoder: UpdateEncoderAny_, offset: number) { encoder.writeJSON(this.embed) }

    getRef(): number { return 5 }
}

export const readContentEmbed: YContentDecoder = decoder => {
    return new ContentEmbed(decoder.readJSON())
}
