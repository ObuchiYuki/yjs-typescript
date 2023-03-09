import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Item, Transaction } from 'yjs/dist/src/internals';
export declare class ContentEmbed {
    embed: object;
    constructor(embed: object);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentEmbed;
    splice(offset: number): ContentEmbed;
    mergeWith(right: ContentEmbed): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentEmbed: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentEmbed;
