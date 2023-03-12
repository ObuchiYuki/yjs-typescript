import { AbstractStruct, DeleteSet, StructStore, ID, AbstractType, Transaction, UpdateDecoderAny, UpdateEncoderAny } from '../internals';
export declare const followRedone: (store: StructStore, id: ID) => {
    item: Item;
    diff: number;
};
/**
 * Make sure that neither item nor any of its parents is ever deleted.
 *
 * This property does not persist when storing it into a database or when
 * sending it to other peers
 */
export declare const keepItem: (item: Item | null, keep: boolean) => void;
/**
 * Split leftItem into two items
 */
export declare const splitItem: (transaction: Transaction, leftItem: Item, diff: number) => Item;
/**
 * Redoes the effect of this operation.
 */
export declare const redoItem: (transaction: Transaction, item: Item, redoitems: Set<Item>, itemsToDelete: DeleteSet, ignoreRemoteMapChanges: boolean) => Item | null;
/**
 * Abstract class that represents any content.
 */
export declare class Item extends AbstractStruct {
    /** The item that was originally to the left of this item. */
    origin: ID | null;
    /** The item that is currently to the left of this item. */
    left: Item | null;
    /** The item that is currently to the right of this item. */
    right: Item | null;
    /** The item that was originally to the right of this item. */
    rightOrigin: ID | null;
    parent: AbstractType<any> | ID | null;
    /**
     * If the parent refers to this item with some kind of key (e.g. YMap, the
     * key is specified here. The key is then used to refer to the list in which
     * to insert this item. If `parentSub = null` type._start is the list in
     * which to insert to. Otherwise it is `parent._map`.
     */
    parentSub: string | null;
    /** If this type's effect is redone this type refers to the type that undid this operation. */
    redone: ID | null;
    content: AbstractContent;
    /**
     * bit1: keep
     * bit2: countable
     * bit3: deleted
     * bit4: mark - mark node as fast-search-marker
     */
    info: number;
    /**
     * @param {ID} id
     * @param {Item | null} left
     * @param {ID | null} origin
     * @param {Item | null} right
     * @param {ID | null} rightOrigin
     * @param {AbstractType<any>|ID|null} parent Is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.
     * @param {string | null} parentSub
     * @param {AbstractContent} content
     */
    constructor(id: ID, left: Item | null, origin: ID | null, right: Item | null, rightOrigin: ID | null, parent: AbstractType<any> | ID | null, parentSub: string | null, content: AbstractContent);
    /**
     * This is used to mark the item as an indexed fast-search marker
     */
    set marker(isMarked: boolean);
    get marker(): boolean;
    /** If true, do not garbage collect this Item. */
    get keep(): boolean;
    set keep(doKeep: boolean);
    get countable(): boolean;
    /** Whether this item was deleted or not. */
    get deleted(): boolean;
    set deleted(doDelete: boolean);
    markDeleted(): void;
    /**
     * Return the creator clientID of the missing op or define missing items and return null.
     */
    getMissing(transaction: Transaction, store: StructStore): null | number;
    integrate(transaction: Transaction, offset: number): void;
    /** Returns the next non-deleted item */
    get next(): Item | null;
    /** Returns the previous non-deleted item */
    get prev(): Item | null;
    /**
     * Computes the last content address of this Item.
     */
    get lastId(): ID;
    /** Try to merge two items */
    mergeWith(right: Item): boolean;
    /** Mark this Item as deleted. */
    delete(transaction: Transaction): void;
    gc(store: StructStore, parentGCd: boolean): void;
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     */
    write(encoder: UpdateEncoderAny, offset: number): void;
}
export declare const readItemContent: (decoder: UpdateDecoderAny, info: number) => AbstractContent;
export type ContentRef = (decoder: UpdateDecoderAny) => AbstractContent;
/**
 * A lookup map for reading Item content.
 */
export declare const contentRefs: ContentRef[];
/**
 * Do not implement this class!
 */
export declare class AbstractContent {
    getLength(): number;
    getContent(): any[];
    /**
     * Should return false if this Item is some kind of meta information
     * (e.g. format information).
     *
     * * Whether this Item should be addressable via `yarray.get(i)`
     * * Whether this Item should be counted when computing yarray.length
     */
    isCountable(): boolean;
    copy(): AbstractContent;
    splice(offset: number): AbstractContent;
    mergeWith(right: AbstractContent): boolean;
    integrate(transaction: Transaction, item: Item): void;
    delete(transaction: Transaction): void;
    gc(store: StructStore): void;
    write(encoder: UpdateEncoderAny, offset: number): void;
    getRef(): number;
}
