import { UpdateEncoderAny, StructStore, Item, Transaction, AbstractContent_, AbstractContentDecoder_ } from '../internals';
export declare class ContentBinary implements AbstractContent_ {
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
    write(encoder: UpdateEncoderAny, offset: number): void;
    getRef(): number;
}
export declare const readContentBinary: AbstractContentDecoder_;
