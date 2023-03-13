import { DSDecoderV1, DSEncoderV1, DSDecoderV2, DSEncoderV2, Item, GC, StructStore, Transaction, ID } from '../internals';
export declare class DeleteItem {
    clock: number;
    len: number;
    constructor(clock: number, len: number);
    static findIndex(dis: DeleteItem[], clock: number): number | null;
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
    /** Iterate over all structs that the DeleteSet gc's. */
    iterate(transaction: Transaction, body: (v: GC | Item) => void): void;
    isDeleted(id: ID): boolean;
    sortAndMerge(): void;
    add(client: number, clock: number, length: number): void;
    encode(encoder: DSEncoderV1 | DSEncoderV2): void;
    static mergeAll(dss: DeleteSet[]): DeleteSet;
    static decode(decoder: DSDecoderV1 | DSDecoderV2): DeleteSet;
    static createFromStructStore(ss: StructStore): DeleteSet;
    static decodeAndApply(decoder: DSDecoderV1 | DSDecoderV2, transaction: Transaction, store: StructStore): Uint8Array | null;
}
