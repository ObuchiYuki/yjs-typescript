import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Transaction, Item, StructStore } from 'yjs/dist/src/internals';
/**
 * @private
 */
export declare class ContentString {
    str: string;
    constructor(str: string);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentString;
    splice(offset: number): ContentString;
    mergeWith(right: ContentString): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentString: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentString;
