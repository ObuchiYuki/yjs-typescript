import { DSDecoderV1, DSEncoderV1, DSDecoderV2, DSEncoderV2, Item, GC, StructStore, Transaction, ID } from '../internals';
export declare class DeleteItem {
    clock: number;
    len: number;
    /**
     * @param {number} clock
     * @param {number} len
     */
    constructor(clock: number, len: number);
}
/**
 * We no longer maintain a DeleteStore. DeleteSet is a temporary object that is created when needed.
 * - When created in a transaction, it must only be accessed after sorting, and merging
 *     - This DeleteSet is send to other clients
 * - We do not create a DeleteSet when we send a sync message. The DeleteSet message is created directly from StructStore
 * - We read a DeleteSet as part of a sync/update message. In this case the DeleteSet is already sorted and merged.
 */
export declare class DeleteSet {
    clients: Map<number, DeleteItem[]>;
    constructor();
}
/**
 * Iterate over all structs that the DeleteSet gc's.
 *
 * @param {Transaction} transaction
 * @param {DeleteSet} ds
 * @param {function(GC|Item):void} f
 *
 * @function
 */
export declare const iterateDeletedStructs: (transaction: Transaction, ds: DeleteSet, f: (arg0: GC | Item) => void) => void;
/**
 * @param {Array<DeleteItem>} dis
 * @param {number} clock
 * @return {number|null}
 *
 * @private
 * @function
 */
export declare const findIndexDS: (dis: Array<DeleteItem>, clock: number) => number | null;
/**
 * @param {DeleteSet} ds
 * @param {ID} id
 * @return {boolean}
 *
 * @private
 * @function
 */
export declare const isDeleted: (ds: DeleteSet, id: ID) => boolean;
/**
 * @param {DeleteSet} ds
 *
 * @private
 * @function
 */
export declare const sortAndMergeDeleteSet: (ds: DeleteSet) => void;
/**
 * @param {Array<DeleteSet>} dss
 * @return {DeleteSet} A fresh DeleteSet
 */
export declare const mergeDeleteSets: (dss: Array<DeleteSet>) => DeleteSet;
/**
 * @param {DeleteSet} ds
 * @param {number} client
 * @param {number} clock
 * @param {number} length
 *
 * @private
 * @function
 */
export declare const addToDeleteSet: (ds: DeleteSet, client: number, clock: number, length: number) => void;
export declare const createDeleteSet: () => DeleteSet;
/**
 * @param {StructStore} ss
 * @return {DeleteSet} Merged and sorted DeleteSet
 *
 * @private
 * @function
 */
export declare const createDeleteSetFromStructStore: (ss: StructStore) => DeleteSet;
/**
 * @param {DSEncoderV1 | DSEncoderV2} encoder
 * @param {DeleteSet} ds
 *
 * @private
 * @function
 */
export declare const writeDeleteSet: (encoder: DSEncoderV1 | DSEncoderV2, ds: DeleteSet) => void;
/**
 * @param {DSDecoderV1 | DSDecoderV2} decoder
 * @return {DeleteSet}
 *
 * @private
 * @function
 */
export declare const readDeleteSet: (decoder: DSDecoderV1 | DSDecoderV2) => DeleteSet;
/**
 * @todo YDecoder also contains references to String and other Decoders. Would make sense to exchange YDecoder.toUint8Array for YDecoder.DsToUint8Array()..
 */
/**
 * @param {DSDecoderV1 | DSDecoderV2} decoder
 * @param {Transaction} transaction
 * @param {StructStore} store
 * @return {Uint8Array|null} Returns a v2 update containing all deletes that couldn't be applied yet; or null if all deletes were applied successfully.
 *
 * @private
 * @function
 */
export declare const readAndApplyDeleteSet: (decoder: DSDecoderV1 | DSDecoderV2, transaction: Transaction, store: StructStore) => Uint8Array | null;
