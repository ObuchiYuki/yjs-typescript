import { StructStore, Transaction, UpdateEncoderAny, ID, AbstractStruct_ } from '../internals';
export declare const structGCRefNumber = 0;
export declare class GC implements AbstractStruct_ {
    id: ID;
    length: number;
    constructor(id: ID, length: number);
    get deleted(): boolean;
    delete(): void;
    mergeWith(right: GC): boolean;
    integrate(transaction: Transaction, offset: number): void;
    write(encoder: UpdateEncoderAny, offset: number): void;
    getMissing(transaction: Transaction, store: StructStore): number | null;
}
