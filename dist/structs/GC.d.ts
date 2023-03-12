import { AbstractStruct, UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction } from '../internals';
export declare const structGCRefNumber = 0;
/**
 * @private
 */
export declare class GC extends AbstractStruct {
    get deleted(): boolean;
    delete(): void;
    mergeWith(right: GC): boolean;
    integrate(transaction: Transaction, offset: number): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getMissing(transaction: Transaction, store: StructStore): number | null;
}
