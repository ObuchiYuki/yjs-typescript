
import {
    UpdateEncoderAny, ID, Transaction // eslint-disable-line
} from '../internals'

export interface AbstractStructConstructor_ {
    new(id: ID, length: number): AbstractStruct_
}

export interface AbstractStruct_ {
    get deleted(): boolean

    /**
     * Merge this struct with the item to the right.
     * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
     * Also this method does *not* remove right from StructStore!
     * @param {AbstractStruct_} right
     * @return {boolean} wether this merged with right
     */
    mergeWith(right: this): boolean

    write(encoder: UpdateEncoderAny, offset: number, encodingRef: number): void

    integrate(transaction: Transaction, offset: number): void
}
