
import {
    compareIDs,
    findRootTypeKey,
    Item,
    ContentType,
    followRedone,
    ID, Doc, AbstractType_ // eslint-disable-line
} from '../internals'

import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

import { UnexpectedCaseError } from 'lib0-typescript'

/**
 * A relative position is based on the Yjs model and is not affected by document changes.
 * E.g. If you place a relative position before a certain character, it will always point to this character.
 * If you place a relative position at the end of a type, it will always point to the end of the type.
 *
 * A numeric position is often unsuited for user selections, because it does not change when content is inserted
 * before or after.
 *
 * ```Insert(0, 'x')('a|bc') = 'xa|bc'``` Where | is the relative position.
 *
 * One of the properties must be defined.
 *
 * @example
 *     // Current cursor position is at position 10
 *     const relativePosition = createRelativePositionFromIndex(yText, 10)
 *     // modify yText
 *     yText.insert(0, 'abc')
 *     yText.delete(3, 10)
 *     // Compute the cursor position
 *     const absolutePosition = createAbsolutePositionFromRelativePosition(y, relativePosition)
 *     absolutePosition.type === yText // => true
 *     console.log('cursor location is ' + absolutePosition.index) // => cursor location is 3
 *
 */
export class RelativePosition {
    type: ID|null
    tname: string|null
    item: ID | null
    assoc: number

    constructor(type: ID | null, tname: string | null, item: ID | null, assoc: number = 0) {
        this.type = type
        this.tname = tname
        this.item = item
        /**
         * A relative position is associated to a specific character. By default
         * assoc >= 0, the relative position is associated to the character
         * after the meant position.
         * I.e. position 1 in 'ab' is associated to character 'b'.
         *
         * If assoc < 0, then the relative position is associated to the caharacter
         * before the meant position.
         */
        this.assoc = assoc
    }


    toJSON(): { [s: string]: any } {
        const json: { [s: string]: any } = {}
        if (this.type) { json.type = this.type }
        if (this.tname) { json.tname = this.tname }
        if (this.item) { json.item = this.item }
        if (this.assoc != null) { json.assoc = this.assoc }
        return json
    }

    encode(): Uint8Array {
        const encoder = encoding.createEncoder()

        const { type, tname, item, assoc } = this
        if (item !== null) {
            encoding.writeVarUint(encoder, 0)
            item.encode(encoder)
        } else if (tname !== null) {
            // case 2: found position at the end of the list and type is stored in y.share
            encoding.writeUint8(encoder, 1)
            encoding.writeVarString(encoder, tname)
        } else if (type !== null) {
            // case 3: found position at the end of the list and type is attached to an item
            encoding.writeUint8(encoder, 2)
            type.encode(encoder)
        } else {
            throw new UnexpectedCaseError()
        }
        encoding.writeVarInt(encoder, assoc)
        
        return encoding.toUint8Array(encoder)
    }


    static decode(uint8Array: Uint8Array): RelativePosition {
        const decoder = decoding.createDecoder(uint8Array)
        let type = null
        let tname = null
        let itemID = null
        switch (decoding.readVarUint(decoder)) {
            case 0:
                // case 1: found position somewhere in the linked list
                itemID = ID.decode(decoder)
                break
            case 1:
                // case 2: found position at the end of the list and type is stored in y.share
                tname = decoding.readVarString(decoder)
                break
            case 2: {
                // case 3: found position at the end of the list and type is attached to an item
                type = ID.decode(decoder)
            }
        }
        const assoc = decoding.hasContent(decoder) ? decoding.readVarInt(decoder) : 0
        return new RelativePosition(type, tname, itemID, assoc)
    }



    static fromJSON(json: { [s: string]: any }): RelativePosition {
        return new RelativePosition(
            json.type == null ? null : new ID(json.type.client, json.type.clock),
            json.tname || null, json.item == null ? null : new ID(json.item.client, json.item.clock),
            json.assoc == null ? 0 : json.assoc
        )
    }
        
    static fromType(type: AbstractType_<any>, item: ID | null, assoc: number): RelativePosition {
        let typeid = null
        let tname = null
        if (type._item === null) {
            tname = findRootTypeKey(type)
        } else {
            typeid = new ID(type._item.id.client, type._item.id.clock)
        }
        return new RelativePosition(typeid, tname, item, assoc)
    }

    /**
     * Create a relativePosition based on a absolute position.
     *
     * @param {AbstractType_<any>} type The base type (e.g. YText or YArray).
     * @param {number} index The absolute position.
     * @param {number} [assoc]
     */
    static fromTypeIndex(type: AbstractType_<any>, index: number, assoc: number = 0): RelativePosition {
        let t = type._start
        if (assoc < 0) {
            // associated to the left character or the beginning of a type, increment index if possible.
            if (index === 0) {
                return RelativePosition.fromType(type, null, assoc)
            }
            index--
        }
        while (t !== null) {
            if (!t.deleted && t.countable) {
                if (t.length > index) {
                    // case 1: found position somewhere in the linked list
                    return RelativePosition.fromType(type, new ID(t.id.client, t.id.clock + index), assoc)
                }
                index -= t.length
            }
            if (t.right === null && assoc < 0) {
                // left-associated position, return last available id
                return RelativePosition.fromType(type, t.lastID, assoc)
            }
            t = t.right
        }
        return RelativePosition.fromType(type, null, assoc)
    }
}

export class AbsolutePosition {
    type: AbstractType_<any>
    index: number
    assoc: number

    constructor(type: AbstractType_<any>, index: number, assoc: number = 0) {
        this.type = type
        this.index = index
        this.assoc = assoc
    }

    static fromRelativePosition(rpos: RelativePosition, doc: Doc): AbsolutePosition | null {
        const store = doc.store
        const rightID = rpos.item
        const typeID = rpos.type
        const tname = rpos.tname
        const assoc = rpos.assoc
        let type = null
        let index = 0
        if (rightID !== null) {
            if (store.getState(rightID.client) <= rightID.clock) {
                return null
            }
            const res = followRedone(store, rightID)
            const right = res.item
            if (!(right instanceof Item)) {
                return null
            }
            type = right.parent as AbstractType_<any>
            if (type._item === null || !type._item.deleted) {
                index = (right.deleted || !right.countable) ? 0 : (res.diff + (assoc >= 0 ? 0 : 1)) // adjust position based on left association if necessary
                let n = right.left
                while (n !== null) {
                    if (!n.deleted && n.countable) {
                        index += n.length
                    }
                    n = n.left
                }
            }
        } else {
            if (tname !== null) {
                type = doc.get(tname)
            } else if (typeID !== null) {
                if (store.getState(typeID.client) <= typeID.clock) {
                    // type does not exist yet
                    return null
                }
                const { item } = followRedone(store, typeID)
                if (item instanceof Item && item.content instanceof ContentType) {
                    type = item.content.type
                } else {
                    // struct is garbage collected
                    return null
                }
            } else {
                throw new UnexpectedCaseError()
            }
            if (assoc >= 0) {
                index = type._length
            } else {
                index = 0
            }
        }
        return new AbsolutePosition(type, index, rpos.assoc)
    }
    
}

export const compareRelativePositions = (a: RelativePosition | null, b: RelativePosition | null): boolean => {
    return a === b || (
        a !== null && b !== null && 
        a.tname === b.tname && 
        compareIDs(a.item, b.item) && compareIDs(a.type, b.type) && 
        a.assoc === b.assoc
    )
}
