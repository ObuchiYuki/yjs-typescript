import { Transaction, Item, StructStore, YContent, YContentDecoder, UpdateEncoderAny_ } from '../internals';
export declare class ContentString implements YContent {
    str: string;
    constructor(str: string);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentString;
    splice(offset: number): ContentString;
    mergeWith(right: ContentString): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderAny_, offset: number): void;
    getRef(): number;
}
export declare const readContentString: YContentDecoder;
