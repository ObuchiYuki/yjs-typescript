import { DSEncoderV1, DSEncoderV2, DSDecoderV1, DSDecoderV2, Transaction, Doc, DeleteSet, // eslint-disable-line
StructStore } from '../internals';
export declare class Snapshot {
    ds: DeleteSet;
    /** State Map */
    sv: Map<number, number>;
    constructor(ds: DeleteSet, sv: Map<number, number>);
    static snapshot(doc: {
        store: StructStore;
    }): Snapshot;
    static empty(): Snapshot;
    encodeV2(encoder?: DSEncoderV1 | DSEncoderV2): Uint8Array;
    encode(): Uint8Array;
    static decodeV2(buf: Uint8Array, decoder?: DSDecoderV1 | DSDecoderV2): Snapshot;
    static decode(buf: Uint8Array): Snapshot;
    splitAffectedStructs(transaction: Transaction): void;
    toDoc(originDoc: Doc, newDoc?: Doc): Doc;
}
export declare const equalSnapshots: (snap1: Snapshot, snap2: Snapshot) => boolean;
