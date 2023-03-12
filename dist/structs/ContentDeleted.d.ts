import { UpdateEncoderAny, StructStore, Item, Transaction, AbstractContent_, AbstractContentDecoder_ } from '../internals';
export declare class ContentDeleted implements AbstractContent_ {
    len: number;
    constructor(len: number);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentDeleted;
    splice(offset: number): ContentDeleted;
    mergeWith(right: ContentDeleted): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderAny, offset: number): void;
    getRef(): number;
}
export declare const readContentDeleted: AbstractContentDecoder_;
