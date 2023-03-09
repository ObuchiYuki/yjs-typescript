import { UpdateEncoderV1, UpdateEncoderV2, ID, Transaction } from 'yjs/dist/src/internals';
export declare class AbstractStruct {
    id: ID;
    length: number;
    constructor(id: ID, length: number);
    get deleted(): boolean;
    /**
     * Merge this struct with the item to the right.
     * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
     * Also this method does *not* remove right from StructStore!
     * @param {AbstractStruct} right
     * @return {boolean} wether this merged with right
     */
    mergeWith(right: AbstractStruct): boolean;
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     * @param {number} offset
     * @param {number} encodingRef
     */
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number, encodingRef: number): void;
    /**
     * @param {Transaction} transaction
     * @param {number} offset
     */
    integrate(transaction: Transaction, offset: number): void;
}
