import { UpdateEncoderAny, StructStore, Item, Transaction, AbstractContent_, AbstractContentDecoder_ } from '../internals';
export declare class ContentFormat implements AbstractContent_ {
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
    write(encoder: UpdateEncoderAny, offset: number): void;
    getRef(): number;
}
export declare const readContentFormat: AbstractContentDecoder_;
