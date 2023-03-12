import { StructStore, Transaction, ID, AbstractStruct_, UpdateEncoderAny } from '../internals';
export declare const structSkipRefNumber = 10;
export declare class Skip implements AbstractStruct_ {
    id: ID;
    length: number;
    constructor(id: ID, length: number);
    get deleted(): boolean;
    delete(): void;
    mergeWith(right: Skip): boolean;
    integrate(transaction: Transaction, offset: number): void;
    write(encoder: UpdateEncoderAny, offset: number): void;
    getMissing(transaction: Transaction, store: StructStore): null | number;
}
