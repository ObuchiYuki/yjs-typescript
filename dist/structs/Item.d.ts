import { Struct_ } from "./Struct_";
import { DeleteSet, StructStore, ID, AbstractType_, Transaction, UpdateDecoderAny_, UpdateEncoderAny_, ContentDecoder_, Content_ } from '../internals';
/** Abstract class that represents any content. */
export declare class Item extends Struct_ {
    /** The item that was originally to the left of this item. */
    origin: ID | null;
    /** The item that is currently to the left of this item. */
    left: Item | null;
    /** The item that is currently to the right of this item. */
    right: Item | null;
    /** The item that was originally to the right of this item. */
    rightOrigin: ID | null;
    parent: AbstractType_<any> | ID | null;
    /**
     * If the parent refers to this item with some kind of key (e.g. YMap, the
     * key is specified here. The key is then used to refer to the list in which
     * to insert this item. If `parentSub = null` type._start is the list in
     * which to insert to. Otherwise it is `parent._map`.
     */
    parentSub: string | null;
    /** If this type's effect is redone this type refers to the type that undid this operation. */
    redone: ID | null;
    content: Content_;
    /**
     * bit1: keep
     * bit2: countable
     * bit3: deleted
     * bit4: mark - mark node as fast-search-marker
     */
    info: number;
    /** This is used to mark the item as an indexed fast-search marker */
    set marker(isMarked: boolean);
    get marker(): boolean;
    /** If true, do not garbage collect this Item. */
    get keep(): boolean;
    set keep(doKeep: boolean);
    get countable(): boolean;
    /** Whether this item was deleted or not. */
    get deleted(): boolean;
    set deleted(doDelete: boolean);
    /**
    * Make sure that neither item nor any of its parents is ever deleted.
    *
    * This property does not persist when storing it into a database or when
    * sending it to other peers
    */
    static keepRecursive(item: Item | null, keep: boolean): void;
    /** parent is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.*/
    constructor(id: ID, left: Item | null, origin: ID | null, right: Item | null, rightOrigin: ID | null, parent: AbstractType_<any> | ID | null, parentSub: string | null, content: Content_);
    markDeleted(): void;
    /** Split leftItem into two items; this -> leftItem */
    split(transaction: Transaction, diff: number): Item;
    /** Redoes the effect of this operation. */
    redo(transaction: Transaction, redoitems: Set<Item>, itemsToDelete: DeleteSet, ignoreRemoteMapChanges: boolean): Item | null;
    /** Return the creator clientID of the missing op or define missing items and return null. */
    getMissing(transaction: Transaction, store: StructStore): null | number;
    integrate(transaction: Transaction, offset: number): void;
    /** Returns the next non-deleted item */
    get next(): Item | null;
    /** Returns the previous non-deleted item */
    get prev(): Item | null;
    /**
     * Computes the last content address of this Item.
     */
    get lastID(): ID;
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
    write(encoder: UpdateEncoderAny_, offset: number): void;
}
export declare const readItemContent: (decoder: UpdateDecoderAny_, info: number) => Content_;
/** A lookup map for reading Item content. */
export declare const contentDecoders_: ContentDecoder_[];
