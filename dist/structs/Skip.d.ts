import { Struct_ } from "./Struct_";
import { StructStore, Transaction, UpdateEncoderAny_ } from '../internals';
export declare const structSkipRefNumber = 10;
export declare class Skip extends Struct_ {
    get deleted(): boolean;
    delete(): void;
    mergeWith(right: Skip): boolean;
    integrate(transaction: Transaction, offset: number): void;
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getMissing(transaction: Transaction, store: StructStore): null | number;
}
