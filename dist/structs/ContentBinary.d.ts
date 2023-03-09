import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Item, Transaction } from 'yjs/dist/src/internals';
export declare class ContentBinary {
    content: Uint8Array;
    constructor(content: Uint8Array);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentBinary;
    splice(offset: number): ContentBinary;
    mergeWith(right: ContentBinary): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentBinary: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentBinary;
