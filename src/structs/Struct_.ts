
import {
    UpdateEncoderAny_, ID, Transaction, // eslint-disable-line
    Item,
    AbstractType_
} from '../internals'

export abstract class Struct_ {
    
    constructor(
        public id: ID, 
        public length: number
    ) {}

    abstract get deleted(): boolean

    /**
     * Merge this struct with the item to the right.
     * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
     * Also this method does *not* remove right from StructStore!
     * @param {AbstractStruct} right
     * @return {boolean} wether this merged with right
     */
    mergeWith(right: Struct_): boolean { return false }

    abstract write(encoder: UpdateEncoderAny_, offset: number, encodingRef: number): void

    abstract integrate(transaction: Transaction, offset: number): void

    // try to
    static tryMergeWithLeft(structs: Array<Struct_>, pos: number) {
        const left = structs[pos - 1]
        const right = structs[pos]
        if (left.deleted === right.deleted && left.constructor === right.constructor) {
            if (left.mergeWith(right)) {
                structs.splice(pos, 1)
                if (right instanceof Item 
                    && right.parentSub !== null 
                    && (right.parent as AbstractType_<any>)._map.get(right.parentSub) === right
                    ) {
                    (right.parent as AbstractType_<any>)._map.set(right.parentSub, left as Item)
                }
            }
        }
    }
}
