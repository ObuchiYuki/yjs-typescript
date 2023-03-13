import { UpdateEncoderAny_, StructStore, Item, Transaction, Content_, ContentDecoder_ } from '../internals';
export declare class ContentDeleted implements Content_ {
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
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentDeleted: ContentDecoder_;
