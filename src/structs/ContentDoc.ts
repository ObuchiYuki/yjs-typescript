
import {
    Doc, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction, Item // eslint-disable-line
} from 'yjs/dist/src/internals'

import * as error from 'lib0/error'

type ContentDocOpts = { [K in string]: any }

const createDocFromOpts = (guid: string, opts: ContentDocOpts) => {
    return new Doc({ guid, ...opts, shouldLoad: opts.shouldLoad || opts.autoLoad || false })
}

export class ContentDoc {
    doc: Doc
    opts: ContentDocOpts

    constructor(doc: Doc) {
        if (doc._item) {
            console.error('This document was already integrated as a sub-document. You should create a second instance instead with the same guid.')
        }
        this.doc = doc

        const opts: ContentDocOpts = {}
        if (!doc.gc) { opts["gc"] = false }
        if (doc.autoLoad) { opts.autoLoad = true }
        if (doc.meta !== null) { opts.meta = doc.meta }
        this.opts = opts
    }

    getLength(): number { return 1 }

    getContent(): any[] { return [this.doc] }

    isCountable(): boolean { return true }
    
    copy(): ContentDoc { return new ContentDoc(createDocFromOpts(this.doc.guid, this.opts)) }

    splice(offset: number) { throw error.methodUnimplemented() }

    mergeWith(right: ContentDoc): boolean {
        return false
    }

    integrate(transaction: Transaction, item: Item) {
        // this needs to be reflected in doc.destroy as well
        this.doc._item = item
        transaction.subdocsAdded.add(this.doc)
        if (this.doc.shouldLoad) {
            transaction.subdocsLoaded.add(this.doc)
        }
    }

    delete(transaction: Transaction) {
        if (transaction.subdocsAdded.has(this.doc)) {
            transaction.subdocsAdded.delete(this.doc)
        } else {
            transaction.subdocsRemoved.add(this.doc)
        }
    }

    gc(store: StructStore) { }

    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number) {
        encoder.writeString(this.doc.guid)
        encoder.writeAny(this.opts)
    }

    getRef(): number { return 9 }
}

export const readContentDoc = (decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentDoc => {
    return new ContentDoc(createDocFromOpts(decoder.readString(), decoder.readAny()))
}
