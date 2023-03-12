
import {
    GC,
    getState,
    AbstractStruct,
    replaceStruct,
    addStruct,
    addToDeleteSet,
    findRootTypeKey,
    compareIDs,
    getItem,
    getItemCleanEnd,
    getItemCleanStart,
    readContentDeleted,
    readContentBinary,
    readContentJSON,
    readContentAny,
    readContentString,
    readContentEmbed,
    readContentDoc,
    createID,
    readContentFormat,
    readContentType,
    addChangedTypeToTransaction,
    isDeleted,
    DeleteSet, ContentType, ContentDeleted, StructStore, ID, AbstractType, Transaction,

    UpdateDecoderAny, UpdateEncoderAny
} from '../internals'

import * as error from 'lib0/error'
import * as binary from 'lib0/binary'

export const followRedone = (store: StructStore, id: ID): { item: Item, diff: number } => {
    let nextID: ID|null = id
    let diff = 0
    let item: Item | null
    do {
        if (diff > 0) {
            nextID = createID(nextID.client, nextID.clock + diff)
        }
        item = getItem(store, nextID)
        diff = nextID.clock - item.id.clock
        nextID = item.redone
    } while (nextID !== null && item instanceof Item)
    
    return { item, diff }
}

/**
 * Make sure that neither item nor any of its parents is ever deleted.
 *
 * This property does not persist when storing it into a database or when
 * sending it to other peers
 */
export const keepItem = (item: Item|null, keep: boolean) => {
    while (item !== null && item.keep !== keep) {
        item.keep = keep
        item = (item.parent as AbstractType<any>)._item
    }
}

/**
 * Split leftItem into two items
 */
export const splitItem = (transaction: Transaction, leftItem: Item, diff: number): Item => {
    // create rightItem
    const { client, clock } = leftItem.id
    const rightItem = new Item(
        createID(client, clock + diff),
        leftItem,
        createID(client, clock + diff - 1),
        leftItem.right,
        leftItem.rightOrigin,
        leftItem.parent,
        leftItem.parentSub,
        leftItem.content.splice(diff)
    )
    if (leftItem.deleted) {
        rightItem.markDeleted()
    }
    if (leftItem.keep) {
        rightItem.keep = true
    }
    if (leftItem.redone !== null) {
        rightItem.redone = createID(leftItem.redone.client, leftItem.redone.clock + diff)
    }
    // update left (do not set leftItem.rightOrigin as it will lead to problems when syncing)
    leftItem.right = rightItem
    // update right
    if (rightItem.right !== null) {
        rightItem.right.left = rightItem
    }
    // right is more specific.
    transaction._mergeStructs.push(rightItem)
    // update parent._map
    if (rightItem.parentSub !== null && rightItem.right === null) {
        (rightItem.parent as AbstractType<any>)._map.set(rightItem.parentSub, rightItem)
    }
    leftItem.length = diff
    return rightItem
}

/**
 * Redoes the effect of this operation.
 */
export const redoItem = (transaction: Transaction, item: Item, redoitems: Set<Item>, itemsToDelete: DeleteSet, ignoreRemoteMapChanges: boolean): Item|null => {
    const doc = transaction.doc
    const store = doc.store
    const ownClientID = doc.clientID
    const redone = item.redone
    if (redone !== null) {
        return getItemCleanStart(transaction, redone)
    }
    let parentItem = (item.parent as AbstractType<any>)._item
    /**
     * @type {Item|null}
     */
    let left = null
    /**
     * @type {Item|null}
     */
    let right
    // make sure that parent is redone
    if (parentItem !== null && parentItem.deleted === true) {
        // try to undo parent if it will be undone anyway
        if (parentItem.redone === null && (!redoitems.has(parentItem) || redoItem(transaction, parentItem, redoitems, itemsToDelete, ignoreRemoteMapChanges) === null)) {
            return null
        }
        while (parentItem.redone !== null) {
            parentItem = getItemCleanStart(transaction, parentItem.redone)
        }
    }
    const parentType = parentItem === null ? (item.parent as AbstractType<any>) : (parentItem.content as ContentType).type

    if (item.parentSub === null) {
        // Is an array item. Insert at the old position
        left = item.left
        right = item
        // find next cloned_redo items
        while (left !== null) {

            let leftTrace: Item|null = left
            // trace redone until parent matches
            while (leftTrace !== null && (leftTrace.parent as AbstractType<any>)._item !== parentItem) {
                leftTrace = leftTrace.redone === null ? null : getItemCleanStart(transaction, leftTrace.redone)
            }
            if (leftTrace !== null && (leftTrace.parent as AbstractType<any>)._item === parentItem) {
                left = leftTrace
                break
            }
            left = left.left
        }
        while (right !== null) {

            let rightTrace: Item|null = right
            // trace redone until parent matches
            while (rightTrace !== null && (rightTrace.parent as AbstractType<any>)._item !== parentItem) {
                rightTrace = rightTrace.redone === null ? null : getItemCleanStart(transaction, rightTrace.redone)
            }
            if (rightTrace !== null && (rightTrace.parent as AbstractType<any>)._item === parentItem) {
                right = rightTrace
                break
            }
            right = right.right
        }
    } else {
        right = null
        if (item.right && !ignoreRemoteMapChanges) {
            left = item
            // Iterate right while right is in itemsToDelete
            // If it is intended to delete right while item is redone, we can expect that item should replace right.
            while (left !== null && left.right !== null && isDeleted(itemsToDelete, left.right.id)) {
                left = left.right
            }
            // follow redone
            // trace redone until parent matches
            while (left !== null && left.redone !== null) {
                left = getItemCleanStart(transaction, left.redone)
            }
            if (left && left.right !== null) {
                // It is not possible to redo this item because it conflicts with a
                // change from another client
                return null
            }
        } else {
            left = parentType._map.get(item.parentSub) || null
        }
    }
    const nextClock = getState(store, ownClientID)
    const nextId = createID(ownClientID, nextClock)
    const redoneItem = new Item(
        nextId,
        left, left && left.lastId,
        right, right && right.id,
        parentType,
        item.parentSub,
        item.content.copy()
    )
    item.redone = nextId
    keepItem(redoneItem, true)
    redoneItem.integrate(transaction, 0)
    return redoneItem
}

/**
 * Abstract class that represents any content.
 */
export class Item extends AbstractStruct {
    /** The item that was originally to the left of this item. */
    origin: ID|null

    /** The item that is currently to the left of this item. */
    left: Item| null

    /** The item that is currently to the right of this item. */
    right: Item | null

    /** The item that was originally to the right of this item. */
    rightOrigin: ID | null
    
    parent: AbstractType<any>|ID|null
    /**
     * If the parent refers to this item with some kind of key (e.g. YMap, the
     * key is specified here. The key is then used to refer to the list in which
     * to insert this item. If `parentSub = null` type._start is the list in
     * which to insert to. Otherwise it is `parent._map`.
     */
    parentSub: string | null
    
    /** If this type's effect is redone this type refers to the type that undid this operation. */
    redone: ID | null
    
    content: AbstractContent

    /**
     * bit1: keep
     * bit2: countable
     * bit3: deleted
     * bit4: mark - mark node as fast-search-marker
     */
    info: number

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
    constructor(
        id: ID, 
        left: Item | null, 
        origin: ID | null,
        right: Item | null, 
        rightOrigin: ID | null,
        parent: AbstractType<any>|ID|null,
        parentSub: string | null,
        content: AbstractContent
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
        this.info = this.content.isCountable() ? binary.BIT2 : 0
    }

    /**
     * This is used to mark the item as an indexed fast-search marker
     */
    set marker(isMarked: boolean) {
        if (((this.info & binary.BIT4) > 0) !== isMarked) { this.info ^= binary.BIT4 }
    }

    get marker () { return (this.info & binary.BIT4) > 0 }

    /** If true, do not garbage collect this Item. */
    get keep () { return (this.info & binary.BIT1) > 0 }

    set keep (doKeep) { if (this.keep !== doKeep) { this.info ^= binary.BIT1 } }

    get countable () { return (this.info & binary.BIT2) > 0 }

    /** Whether this item was deleted or not. */
    get deleted(): boolean {
        return (this.info & binary.BIT3) > 0
    }
    set deleted(doDelete: boolean) {
        if (this.deleted !== doDelete) {
            this.info ^= binary.BIT3
        }
    }

    markDeleted() { this.info |= binary.BIT3 }

    /**
     * Return the creator clientID of the missing op or define missing items and return null.
     */
    getMissing(transaction: Transaction, store: StructStore): null | number {
        if (this.origin && this.origin.client !== this.id.client && this.origin.clock >= getState(store, this.origin.client)) {
            return this.origin.client
        }
        if (this.rightOrigin && this.rightOrigin.client !== this.id.client && this.rightOrigin.clock >= getState(store, this.rightOrigin.client)) {
            return this.rightOrigin.client
        }
        if (this.parent && this.parent.constructor === ID && this.id.client !== this.parent.client && this.parent.clock >= getState(store, this.parent.client)) {
            return this.parent.client
        }

        // We have all missing ids, now find the items

        if (this.origin) {
            this.left = getItemCleanEnd(transaction, store, this.origin)
            this.origin = this.left.lastId
        }
        if (this.rightOrigin) {
            this.right = getItemCleanStart(transaction, this.rightOrigin)
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
            const parentItem = getItem(store, this.parent)
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
            this.left = getItemCleanEnd(transaction, transaction.doc.store, createID(this.id.client, this.id.clock - 1))
            this.origin = this.left.lastId
            this.content = this.content.splice(offset)
            this.length -= offset
        }

        if (this.parent) {
            if ((!this.left && (!this.right || this.right.left !== null)) || (this.left && this.left.right !== this.right)) {
                let left: Item|null = this.left

                let o: Item|null
                // set o to the first conflicting item
                if (left !== null) {
                    o = left.right
                } else if (this.parentSub !== null) {
                    o = (this.parent as AbstractType<any>)._map.get(this.parentSub) || null
                    while (o !== null && o.left !== null) {
                        o = o.left
                    }
                } else {
                    o = (this.parent as AbstractType<any>)._start
                }
                // TODO: use something like DeleteSet here (a tree implementation would be best)
                // @todo use global set definitions
                const conflictingItems: Set<Item> = new Set()
                const itemsBeforeOrigin: Set<Item> = new Set()
                // Let c in conflictingItems, b in itemsBeforeOrigin
                // ***{origin}bbbb{this}{c,b}{c,b}{o}***
                // Note that conflictingItems is a subset of itemsBeforeOrigin
                while (o !== null && o !== this.right) {
                    itemsBeforeOrigin.add(o)
                    conflictingItems.add(o)
                    if (compareIDs(this.origin, o.origin)) {
                        // case 1
                        if (o.id.client < this.id.client) {
                            left = o
                            conflictingItems.clear()
                        } else if (compareIDs(this.rightOrigin, o.rightOrigin)) {
                            // this and o are conflicting and point to the same integration points. The id decides which item comes first.
                            // Since this is to the left of o, we can break here
                            break
                        } // else, o might be integrated before an item that this conflicts with. If so, we will find it in the next iterations
                    } else if (o.origin !== null && itemsBeforeOrigin.has(getItem(transaction.doc.store, o.origin))) { // use getItem instead of getItemCleanEnd because we don't want / need to split items.
                        // case 2
                        if (!conflictingItems.has(getItem(transaction.doc.store, o.origin))) {
                            left = o
                            conflictingItems.clear()
                        }
                    } else {
                        break
                    }
                    o = o.right
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
                    r = (this.parent as AbstractType<any>)._map.get(this.parentSub) || null
                    while (r !== null && r.left !== null) {
                        r = r.left
                    }
                } else {
                    r = (this.parent as AbstractType<any>)._start
                    ; (this.parent as AbstractType<any>)._start = this
                }
                this.right = r
            }
            if (this.right !== null) {
                this.right.left = this
            } else if (this.parentSub !== null) {
                // set as current parent value if right === null and this is parentSub
                (this.parent as AbstractType<any>)._map.set(this.parentSub, this)
                if (this.left !== null) {
                    // this is the current attribute value of parent. delete right
                    this.left.delete(transaction)
                }
            }
            // adjust length of parent
            if (this.parentSub === null && this.countable && !this.deleted) {
                (this.parent as AbstractType<any>)._length += this.length
            }
            addStruct(transaction.doc.store, this)
            this.content.integrate(transaction, this)
            // add parent to transaction.changed
            addChangedTypeToTransaction(transaction, (this.parent as AbstractType<any>), this.parentSub)
            if (((this.parent as AbstractType<any>)._item !== null && (this.parent as AbstractType<any>)._item!.deleted) || (this.parentSub !== null && this.right !== null)) {
                // delete if parent is deleted or if this is not the current attribute value of parent
                this.delete(transaction)
            }
        } else {
            // parent is not defined. Integrate GC struct instead
            new GC(this.id, this.length).integrate(transaction, 0)
        }
    }

    /** Returns the next non-deleted item */
    get next () {
        let n = this.right
        while (n !== null && n.deleted) { n = n.right }
        return n
    }

    /** Returns the previous non-deleted item */
    get prev () {
        let n = this.left
        while (n !== null && n.deleted) { n = n.left }
        return n
    }

    /**
     * Computes the last content address of this Item.
     */
    get lastId () {
        // allocating ids is pretty costly because of the amount of ids created, so we try to reuse whenever possible
        return this.length === 1 ? this.id : createID(this.id.client, this.id.clock + this.length - 1)
    }

    /** Try to merge two items */
    mergeWith(right: Item): boolean {
        if (
            this.constructor === right.constructor &&
            compareIDs(right.origin, this.lastId) &&
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
            const searchMarker = (this.parent as AbstractType<any>)._searchMarker
            if (searchMarker) {
                searchMarker.forEach(marker => {
                    if (marker.p === right) {
                        // right is going to be "forgotten" so we need to update the marker
                        marker.p = this
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
            const parent = this.parent as AbstractType<any>
            // adjust the length of parent
            if (this.countable && this.parentSub === null) {
                parent._length -= this.length
            }
            this.markDeleted()
            addToDeleteSet(transaction.deleteSet, this.id.client, this.id.clock, this.length)
            addChangedTypeToTransaction(transaction, parent, this.parentSub)
            this.content.delete(transaction)
        }
    }

    gc(store: StructStore, parentGCd: boolean) {
        if (!this.deleted) {
            throw error.unexpectedCase()
        }
        this.content.gc(store)
        if (parentGCd) {
            replaceStruct(store, this, new GC(this.id, this.length))
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
    write(encoder: UpdateEncoderAny, offset: number) {
        const origin = offset > 0 ? createID(this.id.client, this.id.clock + offset - 1) : this.origin
        const rightOrigin = this.rightOrigin
        const parentSub = this.parentSub
        const info = (this.content.getRef() & binary.BITS5) |
            (origin === null ? 0 : binary.BIT8) | // origin is defined
            (rightOrigin === null ? 0 : binary.BIT7) | // right origin is defined
            (parentSub === null ? 0 : binary.BIT6) // parentSub is non-null
        encoder.writeInfo(info)
        if (origin !== null) {
            encoder.writeLeftID(origin)
        }
        if (rightOrigin !== null) {
            encoder.writeRightID(rightOrigin)
        }
        if (origin === null && rightOrigin === null) {
            const parent = (this.parent as AbstractType<any>)
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
                error.unexpectedCase()
            }
            if (parentSub !== null) {
                encoder.writeString(parentSub)
            }
        }
        this.content.write(encoder, offset)
    }
}

export const readItemContent = (decoder: UpdateDecoderAny, info: number): AbstractContent => {
    return contentRefs[info & binary.BITS5](decoder)
}

export type ContentRef = (decoder: UpdateDecoderAny) => AbstractContent

/**
 * A lookup map for reading Item content.
 */
export const contentRefs: ContentRef[] = [
    () => { error.unexpectedCase() }, // GC is not ItemContent
    readContentDeleted, // 1
    readContentJSON, // 2
    readContentBinary, // 3
    readContentString, // 4
    readContentEmbed, // 5
    readContentFormat, // 6
    readContentType, // 7
    readContentAny, // 8
    readContentDoc, // 9
    () => { error.unexpectedCase() } // 10 - Skip is not ItemContent
]

/**
 * Do not implement this class!
 */
export class AbstractContent {
    getLength(): number { throw error.methodUnimplemented() }

    getContent(): any[] { throw error.methodUnimplemented() }

    /**
     * Should return false if this Item is some kind of meta information
     * (e.g. format information).
     *
     * * Whether this Item should be addressable via `yarray.get(i)`
     * * Whether this Item should be counted when computing yarray.length
     */
    isCountable(): boolean { throw error.methodUnimplemented() }

    copy(): AbstractContent { throw error.methodUnimplemented() }

    splice(offset: number): AbstractContent { throw error.methodUnimplemented() }

    mergeWith(right: AbstractContent): boolean { throw error.methodUnimplemented() }

    integrate(transaction: Transaction, item: Item) { throw error.methodUnimplemented() }

    delete(transaction: Transaction) { throw error.methodUnimplemented() }

    gc(store: StructStore) { throw error.methodUnimplemented() }

    write(encoder: UpdateEncoderAny, offset: number) { throw error.methodUnimplemented() }

    getRef(): number { throw error.methodUnimplemented() }
}
