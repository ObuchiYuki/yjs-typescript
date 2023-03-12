import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Item, Transaction } from '../internals';
export declare class ContentDeleted {
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
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentDeleted: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentDeleted;
