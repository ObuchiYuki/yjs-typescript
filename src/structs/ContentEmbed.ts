
import {
    UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Item, Transaction // eslint-disable-line
} from '../internals'

import * as error from 'lib0/error'

export class ContentEmbed {
    constructor(
        public embed: object
    ) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.embed] }

    isCountable(): boolean { return true }

    copy(): ContentEmbed { return new ContentEmbed(this.embed) }

    splice(offset: number): ContentEmbed { throw error.methodUnimplemented() }

    mergeWith(right: ContentEmbed): boolean { return false }

    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}

    write (encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number) { encoder.writeJSON(this.embed) }

    getRef(): number { return 5 }
}

export const readContentEmbed = (decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentEmbed => {
    return new ContentEmbed(decoder.readJSON())
}
