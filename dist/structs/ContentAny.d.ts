import { UpdateEncoderAny_, Transaction, Item, StructStore, Content_, ContentDecoder_ } from '../internals';
export declare class ContentAny implements Content_ {
    array: any[];
    constructor(array: any[]);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentAny;
    splice(offset: number): ContentAny;
    mergeWith(right: ContentAny): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentAny: ContentDecoder_;
