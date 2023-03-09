import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Transaction, Item, StructStore } from 'yjs/dist/src/internals';
/**
 * @private
 */
export declare class ContentJSON {
    arr: any[];
    constructor(arr: any[]);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentJSON;
    splice(offset: number): ContentJSON;
    mergeWith(right: ContentJSON): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentJSON: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentJSON;
