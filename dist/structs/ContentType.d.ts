import { UpdateEncoderAny, UpdateDecoderAny, StructStore, Transaction, Item, AbstractType, AbstractContent_, AbstractContentDecoder_ } from '../internals';
export declare const typeRefs: ((decoder: UpdateDecoderAny) => AbstractType<any>)[];
export declare const YArrayRefID = 0;
export declare const YMapRefID = 1;
export declare const YTextRefID = 2;
export declare const YXmlElementRefID = 3;
export declare const YXmlFragmentRefID = 4;
export declare const YXmlHookRefID = 5;
export declare const YXmlTextRefID = 6;
export declare class ContentType implements AbstractContent_ {
    type: AbstractType<any>;
    constructor(type: AbstractType<any>);
    getLength(): number;
    getContent(): any[];
    isCountable(): boolean;
    copy(): ContentType;
    splice(offset: number): ContentType;
    mergeWith(right: ContentType): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderAny, offset: number): void;
    getRef(): number;
}
export declare const readContentType: AbstractContentDecoder_;
