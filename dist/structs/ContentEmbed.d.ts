import { UpdateEncoderAny_, StructStore, Item, Transaction, YContent, YContentDecoder } from '../internals';
export declare class ContentEmbed implements YContent {
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
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentEmbed: YContentDecoder;
