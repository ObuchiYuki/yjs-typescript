import { Doc, UpdateEncoderAny_, StructStore, Transaction, Item, Content_, ContentDecoder_ } from '../internals';
export type ContentDocOpts = {
    gc?: boolean;
    meta?: any;
    autoLoad?: boolean;
    shouldLoad?: boolean;
};
export declare class ContentDoc implements Content_ {
    doc: Doc;
    opts: ContentDocOpts;
    constructor(doc: Doc);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentDoc;
    splice(offset: number): ContentDoc;
    mergeWith(right: ContentDoc): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentDoc: ContentDecoder_;
