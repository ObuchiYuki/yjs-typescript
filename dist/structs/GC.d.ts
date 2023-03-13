import { Struct_ } from "./Struct_";
import { StructStore, Transaction, UpdateEncoderAny_ } from '../internals';
export declare const structGCRefNumber = 0;
export declare class GC extends Struct_ {
    get deleted(): boolean;
    delete(): void;
    mergeWith(right: GC): boolean;
    integrate(transaction: Transaction, offset: number): void;
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getMissing(transaction: Transaction, store: StructStore): number | null;
}
