import { AbstractStruct, UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction } from 'yjs/dist/src/internals';
export declare const structSkipRefNumber = 10;
export declare class Skip extends AbstractStruct {
    get deleted(): boolean;
    delete(): void;
    mergeWith(right: Skip): boolean;
    integrate(transaction: Transaction, offset: number): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getMissing(transaction: Transaction, store: StructStore): null | number;
}
