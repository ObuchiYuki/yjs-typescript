
import {
    readYArray,
    readYMap,
    readYText,
    readYXmlElement,
    readYXmlFragment,
    readYXmlHook,
    readYXmlText,
    UpdateEncoderAny, UpdateDecoderAny,
    
    StructStore, Transaction, Item, AbstractType,

    AbstractContent_, AbstractContentDecoder_
} from '../internals'

import * as error from 'lib0/error'

export const typeRefs: ( (decoder: UpdateDecoderAny) => AbstractType<any> )[] = [
    readYArray,
    readYMap,
    readYText,
    readYXmlElement,
    readYXmlFragment,
    readYXmlHook,
    readYXmlText
]

export const YArrayRefID = 0
export const YMapRefID = 1
export const YTextRefID = 2
export const YXmlElementRefID = 3
export const YXmlFragmentRefID = 4
export const YXmlHookRefID = 5
export const YXmlTextRefID = 6

export class ContentType implements AbstractContent_ {
    constructor(public type: AbstractType<any>) {}

    getLength(): number { return 1 }

    getContent(): any[] { return [this.type] }

    isCountable(): boolean { return true }

    copy(): ContentType { return new ContentType(this.type._copy()) }

    splice(offset: number): ContentType { throw error.methodUnimplemented() }

    mergeWith(right: ContentType): boolean { return false }

    integrate(transaction: Transaction, item: Item) {
        this.type._integrate(transaction.doc, item)
    }

    delete(transaction: Transaction) {
        let item = this.type._start
        while (item !== null) {
            if (!item.deleted) {
                item.delete(transaction)
            } else {
                // This will be gc'd later and we want to merge it if possible
                // We try to merge all deleted items after each transaction,
                // but we have no knowledge about that this needs to be merged
                // since it is not in transaction.ds. Hence we add it to transaction._mergeStructs
                transaction._mergeStructs.push(item)
            }
            item = item.right
        }
        this.type._map.forEach(item => {
            if (!item.deleted) {
                item.delete(transaction)
            } else {
                // same as above
                transaction._mergeStructs.push(item)
            }
        })
        transaction.changed.delete(this.type)
    }

    gc(store: StructStore) {
        let item = this.type._start
        while (item !== null) {
            item.gc(store, true)
            item = item.right
        }
        this.type._start = null
        this.type._map.forEach((item: Item | null) => {
            while (item !== null) {
                item.gc(store, true)
                item = item.left
            }
        })
        this.type._map = new Map()
    }

    write (encoder: UpdateEncoderAny, offset: number) {
        this.type._write(encoder)
    }

    getRef(): number { return 7 }
}

export const readContentType: AbstractContentDecoder_ = decoder => {
    return new ContentType(typeRefs[decoder.readTypeRef()](decoder))
}
