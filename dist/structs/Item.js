"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentDecoders_ = exports.readItemContent = exports.Item = exports.redoItem = exports.splitItem = exports.keepItem = exports.followRedone = void 0;
const Struct_1 = require("./Struct_");
const internals_1 = require("../internals");
const error = require("lib0/error");
const binary = require("lib0/binary");
const followRedone = (store, id) => {
    let nextID = id;
    let diff = 0;
    let item = null;
    do {
        if (diff > 0) {
            nextID = (0, internals_1.createID)(nextID.client, nextID.clock + diff);
        }
        item = (0, internals_1.getItem)(store, nextID);
        diff = nextID.clock - item.id.clock;
        nextID = item.redone;
    } while (nextID !== null && item instanceof Item);
    return { item, diff };
};
exports.followRedone = followRedone;
/**
 * Make sure that neither item nor any of its parents is ever deleted.
 *
 * This property does not persist when storing it into a database or when
 * sending it to other peers
 */
const keepItem = (item, keep) => {
    while (item !== null && item.keep !== keep) {
        item.keep = keep;
        item = item.parent._item;
    }
};
exports.keepItem = keepItem;
/**
 * Split leftItem into two items
 */
const splitItem = (transaction, leftItem, diff) => {
    // create rightItem
    const { client, clock } = leftItem.id;
    const rightItem = new Item((0, internals_1.createID)(client, clock + diff), leftItem, (0, internals_1.createID)(client, clock + diff - 1), leftItem.right, leftItem.rightOrigin, leftItem.parent, leftItem.parentSub, leftItem.content.splice(diff));
    if (leftItem.deleted) {
        rightItem.markDeleted();
    }
    if (leftItem.keep) {
        rightItem.keep = true;
    }
    if (leftItem.redone !== null) {
        rightItem.redone = (0, internals_1.createID)(leftItem.redone.client, leftItem.redone.clock + diff);
    }
    // update left (do not set leftItem.rightOrigin as it will lead to problems when syncing)
    leftItem.right = rightItem;
    // update right
    if (rightItem.right !== null) {
        rightItem.right.left = rightItem;
    }
    // right is more specific.
    transaction._mergeStructs.push(rightItem);
    // update parent._map
    if (rightItem.parentSub !== null && rightItem.right === null) {
        rightItem.parent._map.set(rightItem.parentSub, rightItem);
    }
    leftItem.length = diff;
    return rightItem;
};
exports.splitItem = splitItem;
/**
 * Redoes the effect of this operation.
 */
const redoItem = (transaction, item, redoitems, itemsToDelete, ignoreRemoteMapChanges) => {
    const doc = transaction.doc;
    const store = doc.store;
    const ownClientID = doc.clientID;
    const redone = item.redone;
    if (redone !== null) {
        return (0, internals_1.getItemCleanStart)(transaction, redone);
    }
    let parentItem = item.parent._item;
    /**
     * @type {Item|null}
     */
    let left = null;
    /**
     * @type {Item|null}
     */
    let right;
    // make sure that parent is redone
    if (parentItem !== null && parentItem.deleted === true) {
        // try to undo parent if it will be undone anyway
        if (parentItem.redone === null && (!redoitems.has(parentItem) || (0, exports.redoItem)(transaction, parentItem, redoitems, itemsToDelete, ignoreRemoteMapChanges) === null)) {
            return null;
        }
        while (parentItem.redone !== null) {
            parentItem = (0, internals_1.getItemCleanStart)(transaction, parentItem.redone);
        }
    }
    const parentType = parentItem === null ? item.parent : parentItem.content.type;
    if (item.parentSub === null) {
        // Is an array item. Insert at the old position
        left = item.left;
        right = item;
        // find next cloned_redo items
        while (left !== null) {
            let leftTrace = left;
            // trace redone until parent matches
            while (leftTrace !== null && leftTrace.parent._item !== parentItem) {
                leftTrace = leftTrace.redone === null ? null : (0, internals_1.getItemCleanStart)(transaction, leftTrace.redone);
            }
            if (leftTrace !== null && leftTrace.parent._item === parentItem) {
                left = leftTrace;
                break;
            }
            left = left.left;
        }
        while (right !== null) {
            let rightTrace = right;
            // trace redone until parent matches
            while (rightTrace !== null && rightTrace.parent._item !== parentItem) {
                rightTrace = rightTrace.redone === null ? null : (0, internals_1.getItemCleanStart)(transaction, rightTrace.redone);
            }
            if (rightTrace !== null && rightTrace.parent._item === parentItem) {
                right = rightTrace;
                break;
            }
            right = right.right;
        }
    }
    else {
        right = null;
        if (item.right && !ignoreRemoteMapChanges) {
            left = item;
            // Iterate right while right is in itemsToDelete
            // If it is intended to delete right while item is redone, we can expect that item should replace right.
            while (left !== null && left.right !== null && (0, internals_1.isDeleted)(itemsToDelete, left.right.id)) {
                left = left.right;
            }
            // follow redone
            // trace redone until parent matches
            while (left !== null && left.redone !== null) {
                left = (0, internals_1.getItemCleanStart)(transaction, left.redone);
            }
            if (left && left.right !== null) {
                // It is not possible to redo this item because it conflicts with a
                // change from another client
                return null;
            }
        }
        else {
            left = parentType._map.get(item.parentSub) || null;
        }
    }
    const nextClock = (0, internals_1.getState)(store, ownClientID);
    const nextId = (0, internals_1.createID)(ownClientID, nextClock);
    const redoneItem = new Item(nextId, left, left && left.lastID, right, right && right.id, parentType, item.parentSub, item.content.copy());
    item.redone = nextId;
    (0, exports.keepItem)(redoneItem, true);
    redoneItem.integrate(transaction, 0);
    return redoneItem;
};
exports.redoItem = redoItem;
/**
 * Abstract class that represents any content.
 */
class Item extends Struct_1.Struct_ {
    /**
     * @param {ID} id
     * @param {Item | null} left
     * @param {ID | null} origin
     * @param {Item | null} right
     * @param {ID | null} rightOrigin
     * @param {AbstractType_<any>|ID|null} parent Is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.
     * @param {string | null} parentSub
     * @param {Content_} content
     */
    constructor(id, left, origin, right, rightOrigin, parent, parentSub, content) {
        super(id, content.getLength());
        this.origin = origin;
        this.left = left;
        this.right = right;
        this.rightOrigin = rightOrigin;
        this.parent = parent;
        this.parentSub = parentSub;
        this.redone = null;
        this.content = content;
        this.info = this.content.isCountable() ? binary.BIT2 : 0;
    }
    /**
     * This is used to mark the item as an indexed fast-search marker
     */
    set marker(isMarked) {
        if (((this.info & binary.BIT4) > 0) !== isMarked) {
            this.info ^= binary.BIT4;
        }
    }
    get marker() { return (this.info & binary.BIT4) > 0; }
    /** If true, do not garbage collect this Item. */
    get keep() { return (this.info & binary.BIT1) > 0; }
    set keep(doKeep) { if (this.keep !== doKeep) {
        this.info ^= binary.BIT1;
    } }
    get countable() { return (this.info & binary.BIT2) > 0; }
    /** Whether this item was deleted or not. */
    get deleted() {
        return (this.info & binary.BIT3) > 0;
    }
    set deleted(doDelete) {
        if (this.deleted !== doDelete) {
            this.info ^= binary.BIT3;
        }
    }
    markDeleted() { this.info |= binary.BIT3; }
    /**
     * Return the creator clientID of the missing op or define missing items and return null.
     */
    getMissing(transaction, store) {
        if (this.origin && this.origin.client !== this.id.client && this.origin.clock >= (0, internals_1.getState)(store, this.origin.client)) {
            return this.origin.client;
        }
        if (this.rightOrigin && this.rightOrigin.client !== this.id.client && this.rightOrigin.clock >= (0, internals_1.getState)(store, this.rightOrigin.client)) {
            return this.rightOrigin.client;
        }
        if (this.parent && this.parent.constructor === internals_1.ID && this.id.client !== this.parent.client && this.parent.clock >= (0, internals_1.getState)(store, this.parent.client)) {
            return this.parent.client;
        }
        // We have all missing ids, now find the items
        if (this.origin) {
            this.left = (0, internals_1.getItemCleanEnd)(transaction, store, this.origin);
            this.origin = this.left.lastID;
        }
        if (this.rightOrigin) {
            this.right = (0, internals_1.getItemCleanStart)(transaction, this.rightOrigin);
            this.rightOrigin = this.right.id;
        }
        if ((this.left && this.left.constructor === internals_1.GC) || (this.right && this.right.constructor === internals_1.GC)) {
            this.parent = null;
        }
        // only set parent if this shouldn't be garbage collected
        if (!this.parent) {
            if (this.left && this.left.constructor === Item) {
                this.parent = this.left.parent;
                this.parentSub = this.left.parentSub;
            }
            if (this.right && this.right.constructor === Item) {
                this.parent = this.right.parent;
                this.parentSub = this.right.parentSub;
            }
        }
        else if (this.parent.constructor === internals_1.ID) {
            const parentItem = (0, internals_1.getItem)(store, this.parent);
            if (parentItem.constructor === internals_1.GC) {
                this.parent = null;
            }
            else {
                this.parent = parentItem.content.type;
            }
        }
        return null;
    }
    integrate(transaction, offset) {
        if (offset > 0) {
            this.id.clock += offset;
            this.left = (0, internals_1.getItemCleanEnd)(transaction, transaction.doc.store, (0, internals_1.createID)(this.id.client, this.id.clock - 1));
            this.origin = this.left.lastID;
            this.content = this.content.splice(offset);
            this.length -= offset;
        }
        if (this.parent) {
            if ((!this.left && (!this.right || this.right.left !== null)) || (this.left && this.left.right !== this.right)) {
                let left = this.left;
                let o;
                // set o to the first conflicting item
                if (left !== null) {
                    o = left.right;
                }
                else if (this.parentSub !== null) {
                    o = this.parent._map.get(this.parentSub) || null;
                    while (o !== null && o.left !== null) {
                        o = o.left;
                    }
                }
                else {
                    o = this.parent._start;
                }
                const conflictingItems = new Set();
                const itemsBeforeOrigin = new Set();
                // Let c in conflictingItems, b in itemsBeforeOrigin
                // ***{origin}bbbb{this}{c,b}{c,b}{o}***
                // Note that conflictingItems is a subset of itemsBeforeOrigin
                while (o !== null && o !== this.right) {
                    itemsBeforeOrigin.add(o);
                    conflictingItems.add(o);
                    if ((0, internals_1.compareIDs)(this.origin, o.origin)) {
                        // case 1
                        if (o.id.client < this.id.client) {
                            left = o;
                            conflictingItems.clear();
                        }
                        else if ((0, internals_1.compareIDs)(this.rightOrigin, o.rightOrigin)) {
                            // this and o are conflicting and point to the same integration points. The id decides which item comes first.
                            // Since this is to the left of o, we can break here
                            break;
                        } // else, o might be integrated before an item that this conflicts with. If so, we will find it in the next iterations
                    }
                    else if (o.origin !== null && itemsBeforeOrigin.has((0, internals_1.getItem)(transaction.doc.store, o.origin))) {
                        // use getItem instead of getItemCleanEnd because we don't want / need to split items.
                        // case 2
                        if (!conflictingItems.has((0, internals_1.getItem)(transaction.doc.store, o.origin))) {
                            left = o;
                            conflictingItems.clear();
                        }
                    }
                    else {
                        break;
                    }
                    o = o.right;
                }
                this.left = left;
            }
            // reconnect left/right + update parent map/start if necessary
            if (this.left !== null) {
                const right = this.left.right;
                this.right = right;
                this.left.right = this;
            }
            else {
                let r;
                if (this.parentSub !== null) {
                    r = this.parent._map.get(this.parentSub) || null;
                    while (r !== null && r.left !== null) {
                        r = r.left;
                    }
                }
                else {
                    r = this.parent._start;
                    this.parent._start = this;
                }
                this.right = r;
            }
            if (this.right !== null) {
                this.right.left = this;
            }
            else if (this.parentSub !== null) {
                // set as current parent value if right === null and this is parentSub
                this.parent._map.set(this.parentSub, this);
                if (this.left !== null) {
                    // this is the current attribute value of parent. delete right
                    this.left.delete(transaction);
                }
            }
            // adjust length of parent
            if (this.parentSub === null && this.countable && !this.deleted) {
                this.parent._length += this.length;
            }
            (0, internals_1.addStruct)(transaction.doc.store, this);
            this.content.integrate(transaction, this);
            // add parent to transaction.changed
            (0, internals_1.addChangedTypeToTransaction)(transaction, this.parent, this.parentSub);
            if ((this.parent._item !== null && this.parent._item.deleted) || (this.parentSub !== null && this.right !== null)) {
                // delete if parent is deleted or if this is not the current attribute value of parent
                this.delete(transaction);
            }
        }
        else {
            // parent is not defined. Integrate GC struct instead
            new internals_1.GC(this.id, this.length).integrate(transaction, 0);
        }
    }
    /** Returns the next non-deleted item */
    get next() {
        let n = this.right;
        while (n !== null && n.deleted) {
            n = n.right;
        }
        return n;
    }
    /** Returns the previous non-deleted item */
    get prev() {
        let n = this.left;
        while (n !== null && n.deleted) {
            n = n.left;
        }
        return n;
    }
    /**
     * Computes the last content address of this Item.
     */
    get lastID() {
        // allocating ids is pretty costly because of the amount of ids created, so we try to reuse whenever possible
        return this.length === 1 ? this.id : (0, internals_1.createID)(this.id.client, this.id.clock + this.length - 1);
    }
    /** Try to merge two items */
    mergeWith(right) {
        if (this.constructor === right.constructor &&
            (0, internals_1.compareIDs)(right.origin, this.lastID) &&
            this.right === right &&
            (0, internals_1.compareIDs)(this.rightOrigin, right.rightOrigin) &&
            this.id.client === right.id.client &&
            this.id.clock + this.length === right.id.clock &&
            this.deleted === right.deleted &&
            this.redone === null &&
            right.redone === null &&
            this.content.constructor === right.content.constructor &&
            this.content.mergeWith(right.content)) {
            const searchMarker = this.parent._searchMarker;
            if (searchMarker) {
                searchMarker.forEach(marker => {
                    if (marker.p === right) {
                        // right is going to be "forgotten" so we need to update the marker
                        marker.p = this;
                        // adjust marker index
                        if (!this.deleted && this.countable) {
                            marker.index -= this.length;
                        }
                    }
                });
            }
            if (right.keep) {
                this.keep = true;
            }
            this.right = right.right;
            if (this.right !== null) {
                this.right.left = this;
            }
            this.length += right.length;
            return true;
        }
        return false;
    }
    /** Mark this Item as deleted. */
    delete(transaction) {
        if (!this.deleted) {
            const parent = this.parent;
            // adjust the length of parent
            if (this.countable && this.parentSub === null) {
                parent._length -= this.length;
            }
            this.markDeleted();
            (0, internals_1.addToDeleteSet)(transaction.deleteSet, this.id.client, this.id.clock, this.length);
            (0, internals_1.addChangedTypeToTransaction)(transaction, parent, this.parentSub);
            this.content.delete(transaction);
        }
    }
    gc(store, parentGCd) {
        if (!this.deleted) {
            throw error.unexpectedCase();
        }
        this.content.gc(store);
        if (parentGCd) {
            (0, internals_1.replaceStruct)(store, this, new internals_1.GC(this.id, this.length));
        }
        else {
            this.content = new internals_1.ContentDeleted(this.length);
        }
    }
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     */
    write(encoder, offset) {
        const origin = offset > 0 ? (0, internals_1.createID)(this.id.client, this.id.clock + offset - 1) : this.origin;
        const rightOrigin = this.rightOrigin;
        const parentSub = this.parentSub;
        const info = (this.content.getRef() & binary.BITS5) |
            (origin === null ? 0 : binary.BIT8) | // origin is defined
            (rightOrigin === null ? 0 : binary.BIT7) | // right origin is defined
            (parentSub === null ? 0 : binary.BIT6); // parentSub is non-null
        encoder.writeInfo(info);
        if (origin !== null) {
            encoder.writeLeftID(origin);
        }
        if (rightOrigin !== null) {
            encoder.writeRightID(rightOrigin);
        }
        if (origin === null && rightOrigin === null) {
            const parent = this.parent;
            if (parent._item !== undefined) {
                const parentItem = parent._item;
                if (parentItem === null) {
                    // parent type on y._map
                    // find the correct key
                    const ykey = (0, internals_1.findRootTypeKey)(parent);
                    encoder.writeParentInfo(true); // write parentYKey
                    encoder.writeString(ykey);
                }
                else {
                    encoder.writeParentInfo(false); // write parent id
                    encoder.writeLeftID(parentItem.id);
                }
            }
            else if (parent.constructor === String) { // this edge case was added by differential updates
                encoder.writeParentInfo(true); // write parentYKey
                encoder.writeString(parent);
            }
            else if (parent.constructor === internals_1.ID) {
                encoder.writeParentInfo(false); // write parent id
                encoder.writeLeftID(parent);
            }
            else {
                error.unexpectedCase();
            }
            if (parentSub !== null) {
                encoder.writeString(parentSub);
            }
        }
        this.content.write(encoder, offset);
    }
}
exports.Item = Item;
const readItemContent = (decoder, info) => {
    return exports.contentDecoders_[info & binary.BITS5](decoder);
};
exports.readItemContent = readItemContent;
/** A lookup map for reading Item content. */
exports.contentDecoders_ = [
    () => { error.unexpectedCase(); },
    internals_1.readContentDeleted,
    internals_1.readContentJSON,
    internals_1.readContentBinary,
    internals_1.readContentString,
    internals_1.readContentEmbed,
    internals_1.readContentFormat,
    internals_1.readContentType,
    internals_1.readContentAny,
    internals_1.readContentDoc,
    () => { error.unexpectedCase(); } // 10 - Skip is not ItemContent
];
