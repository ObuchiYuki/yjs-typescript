import { Struct_ } from "./Struct_"

import {
    GC,
    findRootTypeKey,
    compareIDs,
    readContentDeleted, readContentBinary, readContentJSON, readContentAny, readContentString, readContentEmbed, readContentDoc, readContentFormat, readContentType,
    DeleteSet, ContentType, ContentDeleted, StructStore, ID, AbstractType_, Transaction,

    UpdateDecoderAny_, UpdateEncoderAny_, ContentDecoder_, Content_, Snapshot,
} from '../internals'

import * as lib0 from "lib0-typescript"

// ================================================================================================================ //
// MARK: - Item -
// ================================================================================================================ //
/** Abstract class that represents any content. */
export class Item extends Struct_ {
    // ================================================================================================================ //
    // MARK: - Property -

    /** The item that was originally to the left of this item. */
    origin: ID|null

    /** The item that is currently to the left of this item. */
    left: Item| null

    /** The item that is currently to the right of this item. */
    right: Item | null

    /** The item that was originally to the right of this item. */
    rightOrigin: ID | null
    
    parent: AbstractType_<any>|ID|null
    /**
     * If the parent refers to this item with some kind of key (e.g. YMap, the
     * key is specified here. The key is then used to refer to the list in which
     * to insert this item. If `parentSub = null` type._start is the list in
     * which to insert to. Otherwise it is `parent._map`.
     */
    parentSub: string | null
    
    /** If this type's effect is redone this type refers to the type that undid this operation. */
    redone: ID | null
    
    content: Content_

    /**
     * bit1: keep
     * bit2: countable
     * bit3: deleted
     * bit4: mark - mark node as fast-search-marker
     */
    info: number

    /** This is used to mark the item as an indexed fast-search marker */
    set marker(isMarked: boolean) { if (((this.info & lib0.Bit.n4) > 0) !== isMarked) {  this.info ^= lib0.Bit.n4  } }
    get marker () { return (this.info & lib0.Bit.n4) > 0 }

    /** If true, do not garbage collect this Item. */
    get keep () { return (this.info & lib0.Bit.n1) > 0 }
    set keep (doKeep) { if (this.keep !== doKeep) { this.info ^= lib0.Bit.n1 } }

    get countable () { return (this.info & lib0.Bit.n2) > 0 }

    /** Whether this item was deleted or not. */
    get deleted(): boolean { return (this.info & lib0.Bit.n3) > 0 }
    set deleted(doDelete: boolean) { if (this.deleted !== doDelete) { this.info ^= lib0.Bit.n3 } }

    // ================================================================================================================ //
    // MARK: - Methods -

    /**
    * Make sure that neither item nor any of its parents is ever deleted.
    *
    * This property does not persist when storing it into a database or when
    * sending it to other peers
    */
    static keepRecursive(item: Item|null, keep: boolean) {
        while (item !== null && item.keep !== keep) {
           item.keep = keep
           item = (item.parent as AbstractType_<any>)._item
        }
    }
    
    /** parent is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.*/
    constructor(
        id: ID, left: Item | null, origin: ID | null, right: Item | null, rightOrigin: ID | null, parent: AbstractType_<any>|ID|null, parentSub: string | null, content: Content_
    ) {
        super(id, content.getLength())
        this.origin = origin
        this.left = left
        this.right = right
        this.rightOrigin = rightOrigin
        this.parent = parent
        this.parentSub = parentSub
        this.redone = null
        this.content = content
        this.info = this.content.isCountable() ? lib0.Bit.n2 : 0
    }

    isVisible(snapshot?: Snapshot) {
        return snapshot === undefined
        ? !this.deleted
        : snapshot.sv.has(this.id.client) && (snapshot.sv.get(this.id.client) || 0) > this.id.clock && !snapshot.ds.isDeleted(this.id)
    }

    markDeleted() { this.info |= lib0.Bit.n3 }

    /** Split leftItem into two items; this -> leftItem */
    split(transaction: Transaction, diff: number): Item {
        // create rightItem
        const { client, clock } = this.id
        const rightItem = new Item(
            new ID(client, clock + diff),
            this,
            new ID(client, clock + diff - 1),
            this.right,
            this.rightOrigin,
            this.parent,
            this.parentSub,
            this.content.splice(diff)
        )
        if (this.deleted) {
            rightItem.markDeleted()
        }
        if (this.keep) {
            rightItem.keep = true
        }
        if (this.redone !== null) {
            rightItem.redone = new ID(this.redone.client, this.redone.clock + diff)
        }
        // update left (do not set leftItem.rightOrigin as it will lead to problems when syncing)
        this.right = rightItem
        // update right
        if (rightItem.right !== null) {
            rightItem.right.left = rightItem
        }
        // right is more specific.
        transaction._mergeStructs.push(rightItem)
        // update parent._map
        if (rightItem.parentSub !== null && rightItem.right === null) {
            (rightItem.parent as AbstractType_<any>)._map.set(rightItem.parentSub, rightItem)
        }
        this.length = diff
        return rightItem
    }


    /** Redoes the effect of this operation. */
    redo(transaction: Transaction, redoitems: Set<Item>, itemsToDelete: DeleteSet, ignoreRemoteMapChanges: boolean): Item|null {
        const doc = transaction.doc
        const store = doc.store
        const ownClientID = doc.clientID
        const redone = this.redone
        if (redone !== null) {
            return StructStore.getItemCleanStart(transaction, redone)
        }
        let parentItem = (this.parent as AbstractType_<any>)._item
        /**
         * @type {Item|null}
         */
        let left: Item | null = null
        /**
         * @type {Item|null}
         */
        let right: Item | null
        // make sure that parent is redone
        if (parentItem !== null && parentItem.deleted === true) {
            // try to undo parent if it will be undone anyway
            if (parentItem.redone === null && (!redoitems.has(parentItem) || parentItem.redo(transaction, redoitems, itemsToDelete, ignoreRemoteMapChanges) === null)) {
                return null
            }
            while (parentItem.redone !== null) {
                parentItem = StructStore.getItemCleanStart(transaction, parentItem.redone)
            }
        }
        const parentType = parentItem === null ? (this.parent as AbstractType_<any>) : (parentItem.content as ContentType).type

        if (this.parentSub === null) {
            // Is an array item. Insert at the old position
            left = this.left
            right = this
            // find next cloned_redo items
            while (left !== null) {

                let leftTrace: Item|null = left
                // trace redone until parent matches
                while (leftTrace !== null && (leftTrace.parent as AbstractType_<any>)._item !== parentItem) {
                    leftTrace = leftTrace.redone === null ? null : StructStore.getItemCleanStart(transaction, leftTrace.redone)
                }
                if (leftTrace !== null && (leftTrace.parent as AbstractType_<any>)._item === parentItem) {
                    left = leftTrace
                    break
                }
                left = left.left
            }
            while (right !== null) {

                let rightTrace: Item|null = right
                // trace redone until parent matches
                while (rightTrace !== null && (rightTrace.parent as AbstractType_<any>)._item !== parentItem) {
                    rightTrace = rightTrace.redone === null ? null : StructStore.getItemCleanStart(transaction, rightTrace.redone)
                }
                if (rightTrace !== null && (rightTrace.parent as AbstractType_<any>)._item === parentItem) {
                    right = rightTrace
                    break
                }
                right = right.right
            }
        } else {
            right = null
            if (this.right && !ignoreRemoteMapChanges) {
                left = this
                // Iterate right while right is in itemsToDelete
                // If it is intended to delete right while item is redone, we can expect that item should replace right.
                while (left !== null && left.right !== null && itemsToDelete.isDeleted(left.right.id)) {
                    left = left.right
                }
                // follow redone
                // trace redone until parent matches
                while (left !== null && left.redone !== null) {
                    left = StructStore.getItemCleanStart(transaction, left.redone)
                }
                if (left && left.right !== null) {
                    // It is not possible to redo this item because it conflicts with a
                    // change from another client
                    return null
                }
            } else {
                left = parentType._map.get(this.parentSub) || null
            }
        }
        const nextClock = store.getState(ownClientID)
        const nextId = new ID(ownClientID, nextClock)
        const redoneItem = new Item(
            nextId,
            left, left && left.lastID,
            right, right && right.id,
            parentType,
            this.parentSub,
            this.content.copy()
        )
        this.redone = nextId
        Item.keepRecursive(redoneItem, true)
        redoneItem.integrate(transaction, 0)
        return redoneItem
    }
    
    /** Return the creator clientID of the missing op or define missing items and return null. */
    getMissing(transaction: Transaction, store: StructStore): null | number {
        if (this.origin && this.origin.client !== this.id.client && this.origin.clock >= store.getState(this.origin.client)) {
            return this.origin.client
        }
        if (this.rightOrigin && this.rightOrigin.client !== this.id.client && this.rightOrigin.clock >= store.getState(this.rightOrigin.client)) {
            return this.rightOrigin.client
        }
        if (this.parent && this.parent.constructor === ID && this.id.client !== this.parent.client && this.parent.clock >= store.getState(this.parent.client)) {
            return this.parent.client
        }

        // We have all missing ids, now find the items
        if (this.origin) {
            this.left = store.getItemCleanEnd(transaction, this.origin)
            this.origin = this.left.lastID
        }
        if (this.rightOrigin) {
            this.right = StructStore.getItemCleanStart(transaction, this.rightOrigin)
            this.rightOrigin = this.right.id
        }
        if ((this.left && this.left.constructor === GC) || (this.right && this.right.constructor === GC)) {
            this.parent = null
        }
        // only set parent if this shouldn't be garbage collected
        if (!this.parent) {
            if (this.left && this.left.constructor === Item) {
                this.parent = this.left.parent
                this.parentSub = this.left.parentSub
            }
            if (this.right && this.right.constructor === Item) {
                this.parent = this.right.parent
                this.parentSub = this.right.parentSub
            }
        } else if (this.parent.constructor === ID) {
            const parentItem = store.getItem(this.parent)
            if (parentItem.constructor === GC) {
                this.parent = null
            } else {
                this.parent = (parentItem.content as ContentType).type
            }
        }
        return null
    }

    integrate(transaction: Transaction, offset: number) {
        if (offset > 0) {
            this.id.clock += offset
            this.left = transaction.doc.store.getItemCleanEnd(transaction, new ID(this.id.client, this.id.clock - 1))
            this.origin = this.left.lastID
            this.content = this.content.splice(offset)
            this.length -= offset
        }

        if (this.parent) {
            if ((!this.left && (!this.right || this.right.left !== null)) || (this.left && this.left.right !== this.right)) {
                let left: Item|null = this.left

                let item: Item|null
                // set o to the first conflicting item
                if (left !== null) {
                    item = left.right
                } else if (this.parentSub !== null) {
                    item = (this.parent as AbstractType_<any>)._map.get(this.parentSub) || null
                    while (item !== null && item.left !== null) {
                        item = item.left
                    }
                } else {
                    item = (this.parent as AbstractType_<any>)._start
                }
                
                const conflictingItems = new Set<Item>()
                const itemsBeforeOrigin = new Set<Item>()
                // Let c in conflictingItems, b in itemsBeforeOrigin
                // ***{origin}bbbb{this}{c,b}{c,b}{o}***
                // Note that conflictingItems is a subset of itemsBeforeOrigin
                while (item !== null && item !== this.right) {
                    itemsBeforeOrigin.add(item)
                    conflictingItems.add(item)
                    if (compareIDs(this.origin, item.origin)) {
                        // case 1
                        if (item.id.client < this.id.client) {
                            left = item
                            conflictingItems.clear()
                        } else if (compareIDs(this.rightOrigin, item.rightOrigin)) {
                            // this and o are conflicting and point to the same integration points. The id decides which item comes first.
                            // Since this is to the left of o, we can break here
                            break
                        } // else, o might be integrated before an item that this conflicts with. If so, we will find it in the next iterations
                    } else if (item.origin !== null && itemsBeforeOrigin.has(transaction.doc.store.getItem(item.origin))) { 
                        // use getItem instead of getItemCleanEnd because we don't want / need to split items.
                        // case 2
                        if (!conflictingItems.has(transaction.doc.store.getItem(item.origin))) {
                            left = item
                            conflictingItems.clear()
                        }
                    } else {
                        break
                    }
                    item = item.right
                }
                this.left = left
            }
            // reconnect left/right + update parent map/start if necessary
            if (this.left !== null) {
                const right = this.left.right
                this.right = right
                this.left.right = this
            } else {
                let r
                if (this.parentSub !== null) {
                    r = (this.parent as AbstractType_<any>)._map.get(this.parentSub) || null
                    while (r !== null && r.left !== null) {
                        r = r.left
                    }
                } else {
                    r = (this.parent as AbstractType_<any>)._start
                    ; (this.parent as AbstractType_<any>)._start = this
                }
                this.right = r
            }
            if (this.right !== null) {
                this.right.left = this
            } else if (this.parentSub !== null) {
                // set as current parent value if right === null and this is parentSub
                (this.parent as AbstractType_<any>)._map.set(this.parentSub, this)
                if (this.left !== null) {
                    // this is the current attribute value of parent. delete right
                    this.left.delete(transaction)
                }
            }
            // adjust length of parent
            if (this.parentSub === null && this.countable && !this.deleted) {
                (this.parent as AbstractType_<any>)._length += this.length
            }
            transaction.doc.store.addStruct(this)
            this.content.integrate(transaction, this)
            // add parent to transaction.changed
            transaction.addChangedType((this.parent as AbstractType_<any>), this.parentSub)
            if (((this.parent as AbstractType_<any>)._item !== null && (this.parent as AbstractType_<any>)._item!.deleted) || (this.parentSub !== null && this.right !== null)) {
                // delete if parent is deleted or if this is not the current attribute value of parent
                this.delete(transaction)
            }
        } else {
            // parent is not defined. Integrate GC struct instead
            new GC(this.id, this.length).integrate(transaction, 0)
        }
    }

    /** Returns the next non-deleted item */
    get next() {
        let n = this.right
        while (n !== null && n.deleted) { n = n.right }
        return n
    }

    /** Returns the previous non-deleted item */
    get prev() {
        let n = this.left
        while (n !== null && n.deleted) { n = n.left }
        return n
    }

    /**
     * Computes the last content address of this Item.
     */
    get lastID() {
        // allocating ids is pretty costly because of the amount of ids created, so we try to reuse whenever possible
        return this.length === 1 ? this.id : new ID(this.id.client, this.id.clock + this.length - 1)
    }

    /** Try to merge two items */
    mergeWith(right: Item): boolean {
        if (
            this.constructor === right.constructor &&
            compareIDs(right.origin, this.lastID) &&
            this.right === right &&
            compareIDs(this.rightOrigin, right.rightOrigin) &&
            this.id.client === right.id.client &&
            this.id.clock + this.length === right.id.clock &&
            this.deleted === right.deleted &&
            this.redone === null &&
            right.redone === null &&
            this.content.constructor === right.content.constructor &&
            this.content.mergeWith(right.content)
        ) {
            const searchMarker = (this.parent as AbstractType_<any>)._searchMarker
            if (searchMarker) {
                searchMarker.forEach(marker => {
                    if (marker.item === right) {
                        // right is going to be "forgotten" so we need to update the marker
                        marker.item = this
                        // adjust marker index
                        if (!this.deleted && this.countable) {
                            marker.index -= this.length
                        }
                    }
                })
            }
            if (right.keep) {
                this.keep = true
            }
            this.right = right.right
            if (this.right !== null) {
                this.right.left = this
            }
            this.length += right.length
            return true
        }
        return false
    }

    /** Mark this Item as deleted. */
    delete(transaction: Transaction) {
        if (!this.deleted) {
            const parent = this.parent as AbstractType_<any>
            // adjust the length of parent
            if (this.countable && this.parentSub === null) {
                parent._length -= this.length
            }
            this.markDeleted()
            transaction.deleteSet.add(this.id.client, this.id.clock, this.length)
            transaction.addChangedType(parent, this.parentSub)
            this.content.delete(transaction)
        }
    }

    gc(store: StructStore, parentGCd: boolean) {
        if (!this.deleted) {
            throw new lib0.UnexpectedCaseError()
        }
        this.content.gc(store)
        if (parentGCd) {
            store.replaceStruct(this, new GC(this.id, this.length))
        } else {
            this.content = new ContentDeleted(this.length)
        }
    }

    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     */
    write(encoder: UpdateEncoderAny_, offset: number) {
        const origin = offset > 0 ? new ID(this.id.client, this.id.clock + offset - 1) : this.origin
        const rightOrigin = this.rightOrigin
        const parentSub = this.parentSub
        const info = (this.content.getRef() & lib0.Bits.n5) |
            (origin === null ? 0 : lib0.Bit.n8) | // origin is defined
            (rightOrigin === null ? 0 : lib0.Bit.n7) | // right origin is defined
            (parentSub === null ? 0 : lib0.Bit.n6) // parentSub is non-null
        encoder.writeInfo(info)
        if (origin !== null) {
            encoder.writeLeftID(origin)
        }
        if (rightOrigin !== null) {
            encoder.writeRightID(rightOrigin)
        }
        if (origin === null && rightOrigin === null) {
            const parent = (this.parent as AbstractType_<any>)
            if (parent._item !== undefined) {
                const parentItem = parent._item
                if (parentItem === null) {
                    // parent type on y._map
                    // find the correct key
                    const ykey = findRootTypeKey(parent)
                    encoder.writeParentInfo(true) // write parentYKey
                    encoder.writeString(ykey)
                } else {
                    encoder.writeParentInfo(false) // write parent id
                    encoder.writeLeftID(parentItem.id)
                }
            } else if (parent.constructor === String) { // this edge case was added by differential updates
                encoder.writeParentInfo(true) // write parentYKey
                encoder.writeString(parent)
            } else if (parent.constructor === ID) {
                encoder.writeParentInfo(false) // write parent id
                encoder.writeLeftID(parent)
            } else {
                throw new lib0.UnexpectedCaseError()
            }
            if (parentSub !== null) {
                encoder.writeString(parentSub)
            }
        }
        this.content.write(encoder, offset)
    }


}

export const readItemContent = (decoder: UpdateDecoderAny_, info: number): Content_ => {
    return contentDecoders_[info & lib0.Bits.n5](decoder)
}

/** A lookup map for reading Item content. */
export const contentDecoders_: ContentDecoder_[] = [
    () => { throw new lib0.UnexpectedCaseError() }, // GC is not ItemContent
    readContentDeleted, // 1
    readContentJSON, // 2
    readContentBinary, // 3
    readContentString, // 4
    readContentEmbed, // 5
    readContentFormat, // 6
    readContentType, // 7
    readContentAny, // 8
    readContentDoc, // 9
    () => { throw new lib0.UnexpectedCaseError() } // 10 - Skip is not ItemContent
]
