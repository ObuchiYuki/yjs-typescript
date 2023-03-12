import {
    Item,
    Transaction,
    StructStore,
    UpdateEncoderAny
} from "../internals"

export interface AbstractContent_ {
    getLength(): number
    
    getContent(): any[]
    
    isCountable(): boolean
    
    copy(): AbstractContent_
    
    splice(offset: number): AbstractContent_

    mergeWith(right: this): boolean

    integrate(transaction: Transaction, item: Item): void

    delete(transaction: Transaction): void

    gc(store: StructStore): void

    write(encoder: UpdateEncoderAny, offset: number): void

    getRef(): number
}
