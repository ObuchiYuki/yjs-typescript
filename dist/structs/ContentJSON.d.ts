import { Transaction, Item, StructStore, AbstractContent_, AbstractContentDecoder_, UpdateEncoderAny } from '../internals';
/**
 * @private
 */
export declare class ContentJSON implements AbstractContent_ {
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
    write(encoder: UpdateEncoderAny, offset: number): void;
    getRef(): number;
}
export declare const readContentJSON: AbstractContentDecoder_;
