import { Item, Transaction, StructStore, UpdateEncoderAny_, UpdateDecoderAny_ } from "../internals"

export interface Content_ {
    getLength(): number
    
    getContent(): any[]
    
    isCountable(): boolean
    
    copy(): Content_
    
    splice(offset: number): Content_

    mergeWith(right: this): boolean

    integrate(transaction: Transaction, item: Item): void

    delete(transaction: Transaction): void

    gc(store: StructStore): void

    write(encoder: UpdateEncoderAny_, offset: number): void

    getRef(): number
}

export type ContentDecoder_ = (decoder: UpdateDecoderAny_) => Content_