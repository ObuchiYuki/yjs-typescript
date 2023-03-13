import { UpdateEncoderAny_, StructStore, Item, Transaction, Content_, ContentDecoder_ } from '../internals';
export declare class ContentFormat implements Content_ {
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
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentFormat: ContentDecoder_;
