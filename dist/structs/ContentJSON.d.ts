import { Transaction, Item, StructStore, Content_, ContentDecoder_, UpdateEncoderAny_ } from '../internals';
/**
 * @private
 */
export declare class ContentJSON implements Content_ {
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
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentJSON: ContentDecoder_;
