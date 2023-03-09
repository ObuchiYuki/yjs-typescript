import { Doc, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction, Item } from 'yjs/dist/src/internals';
type ContentDocOpts = {
    [K in string]: any;
};
export declare class ContentDoc {
    doc: Doc;
    opts: ContentDocOpts;
    constructor(doc: Doc);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentDoc;
    splice(offset: number): void;
    mergeWith(right: ContentDoc): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    getRef(): number;
}
export declare const readContentDoc: (decoder: UpdateDecoderV1 | UpdateDecoderV2) => ContentDoc;
export {};
