import { Item, Transaction, StructStore, UpdateEncoderAny_, UpdateDecoderAny_ } from "../internals"

export interface YContent {
    getLength(): number
    
    getContent(): any[]
    
    isCountable(): boolean
    
    copy(): YContent
    
    splice(offset: number): YContent

    mergeWith(right: this): boolean

    integrate(transaction: Transaction, item: Item): void

    delete(transaction: Transaction): void

    gc(store: StructStore): void

    write(encoder: UpdateEncoderAny_, offset: number): void

    getRef(): number
}

export type YContentDecoder = (decoder: UpdateDecoderAny_) => YContent