import { UpdateEncoderAny_, ID, Transaction } from '../internals';
export declare abstract class Struct_ {
    id: ID;
    length: number;
    constructor(id: ID, length: number);
    abstract get deleted(): boolean;
    /**
     * Merge this struct with the item to the right.
     * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
     * Also this method does *not* remove right from StructStore!
     * @param {AbstractStruct} right
     * @return {boolean} wether this merged with right
     */
    mergeWith(right: Struct_): boolean;
    abstract write(encoder: UpdateEncoderAny_, offset: number, encodingRef: number): void;
    abstract integrate(transaction: Transaction, offset: number): void;
}
