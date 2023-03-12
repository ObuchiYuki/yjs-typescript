import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Item, StructStore, Transaction } from '../internals';
export declare class ContentFormat {
    key: string;
    value: object;
    constructor(key: string, value: object);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentFormat;
    splice(offset: number): ContentFormat;
    mergeWith(right: ContentFormat): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentFormat: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentFormat;
