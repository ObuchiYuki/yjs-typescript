import { DSEncoderV1, DSEncoderV2, DSDecoderV1, DSDecoderV2, Transaction, Doc, DeleteSet, Item, // eslint-disable-line
StructStore } from '../internals';
export declare class Snapshot {
    ds: DeleteSet;
    /** State Map  */
    sv: Map<number, number>;
    /**
     * @param {DeleteSet} ds
     * @param {Map<number,number>} sv state map
     */
    constructor(ds: DeleteSet, sv: Map<number, number>);
}
/**
 * @param {Snapshot} snap1
 * @param {Snapshot} snap2
 * @return {boolean}
 */
export declare const equalSnapshots: (snap1: Snapshot, snap2: Snapshot) => boolean;
/**
 * @param {Snapshot} snapshot
 * @param {DSEncoderV1 | DSEncoderV2} [encoder]
 * @return {Uint8Array}
 */
export declare const encodeSnapshotV2: (snapshot: Snapshot, encoder?: DSEncoderV1 | DSEncoderV2) => Uint8Array;
/**
 * @param {Snapshot} snapshot
 * @return {Uint8Array}
 */
export declare const encodeSnapshot: (snapshot: Snapshot) => Uint8Array;
/**
 * @param {Uint8Array} buf
 * @param {DSDecoderV1 | DSDecoderV2} [decoder]
 * @return {Snapshot}
 */
export declare const decodeSnapshotV2: (buf: Uint8Array, decoder?: DSDecoderV1 | DSDecoderV2) => Snapshot;
/**
 * @param {Uint8Array} buf
 * @return {Snapshot}
 */
export declare const decodeSnapshot: (buf: Uint8Array) => Snapshot;
/**
 * @param {DeleteSet} ds
 * @param {Map<number,number>} sm
 * @return {Snapshot}
 */
export declare const createSnapshot: (ds: DeleteSet, sm: Map<number, number>) => Snapshot;
export declare const emptySnapshot: Snapshot;
/**
 * @param {Doc} doc
 * @return {Snapshot}
 */
export declare const snapshot: (doc: {
    store: StructStore;
}) => Snapshot;
/**
 * @param {Item} item
 * @param {Snapshot|undefined} snapshot
 *
 * @protected
 * @function
 */
export declare const isVisible: (item: Item, snapshot: Snapshot | undefined) => boolean;
/**
 * @param {Transaction} transaction
 * @param {Snapshot} snapshot
 */
export declare const splitSnapshotAffectedStructs: (transaction: Transaction, snapshot: Snapshot) => void;
/**
 * @param {Doc} originDoc
 * @param {Snapshot} snapshot
 * @param {Doc} [newDoc] Optionally, you may define the Yjs document that receives the data from originDoc
 * @return {Doc}
 */
export declare const createDocFromSnapshot: (originDoc: Doc, snapshot: Snapshot, newDoc?: Doc) => Doc;
