
import {
    UpdateEncoderV1, UpdateEncoderV2, ID, Transaction // eslint-disable-line
} from '../internals'

import * as error from 'lib0/error'

export class AbstractStruct {
    
    constructor(
        public id: ID,
        public length: number
    ) {}

    get deleted(): boolean {
        throw error.methodUnimplemented()
    }

    /**
     * Merge this struct with the item to the right.
     * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
     * Also this method does *not* remove right from StructStore!
     * @param {AbstractStruct} right
     * @return {boolean} wether this merged with right
     */
    mergeWith(right: AbstractStruct): boolean {
        return false
    }

    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     * @param {number} offset
     * @param {number} encodingRef
     */
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number, encodingRef: number) {
        throw error.methodUnimplemented()
    }

    /**
     * @param {Transaction} transaction
     * @param {number} offset
     */
    integrate(transaction: Transaction, offset: number) {
        throw error.methodUnimplemented()
    }
}
