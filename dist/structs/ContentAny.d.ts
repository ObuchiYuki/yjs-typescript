import { UpdateEncoderV1, UpdateEncoderV2, UpdateDecoderV1, UpdateDecoderV2, Transaction, Item, StructStore } from '../internals';
export declare class ContentAny {
    arr: any[];
    constructor(arr: any[]);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentAny;
    splice(offset: number): ContentAny;
    mergeWith(right: ContentAny): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentAny: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentAny;
