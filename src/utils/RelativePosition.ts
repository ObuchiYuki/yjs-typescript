
import {
    writeID,
    readID,
    compareIDs,
    getState,
    findRootTypeKey,
    Item,
    createID,
    ContentType,
    followRedone,
    ID, Doc, AbstractType // eslint-disable-line
} from '../internals'

import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as error from 'lib0/error'

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

    /**
     * @param {ID|null} type
     * @param {string|null} tname
     * @param {ID|null} item
     * @param {number} assoc
     */
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
}

/**
 * @param {RelativePosition} rpos
 * @return {any}
 */
export const relativePositionToJSON = (rpos: RelativePosition): any => {
    const json: any = {}
    if (rpos.type) {
        json.type = rpos.type
    }
    if (rpos.tname) {
        json.tname = rpos.tname
    }
    if (rpos.item) {
        json.item = rpos.item
    }
    if (rpos.assoc != null) {
        json.assoc = rpos.assoc
    }
    return json
}

/**
 * @param {any} json
 * @return {RelativePosition}
 *
 * @function
 */
export const createRelativePositionFromJSON = (json: any): RelativePosition => {
    return new RelativePosition(json.type == null ? null : createID(json.type.client, json.type.clock), json.tname || null, json.item == null ? null : createID(json.item.client, json.item.clock), json.assoc == null ? 0 : json.assoc)
}

export class AbsolutePosition {
    type: AbstractType<any>
    index: number
    assoc: number

    constructor(type: AbstractType<any>, index: number, assoc: number = 0) {
        this.type = type
        this.index = index
        this.assoc = assoc
    }
}

/**
 * @param {AbstractType<any>} type
 * @param {number} index
 * @param {number} [assoc]
 *
 * @function
 */
export const createAbsolutePosition = (type: AbstractType<any>, index: number, assoc: number = 0) => {
    return new AbsolutePosition(type, index, assoc)
}

/**
 * @param {AbstractType<any>} type
 * @param {ID|null} item
 * @param {number} [assoc]
 *
 * @function
 */
export const createRelativePosition = (type: AbstractType<any>, item: ID | null, assoc: number) => {
    let typeid = null
    let tname = null
    if (type._item === null) {
        tname = findRootTypeKey(type)
    } else {
        typeid = createID(type._item.id.client, type._item.id.clock)
    }
    return new RelativePosition(typeid, tname, item, assoc)
}

/**
 * Create a relativePosition based on a absolute position.
 *
 * @param {AbstractType<any>} type The base type (e.g. YText or YArray).
 * @param {number} index The absolute position.
 * @param {number} [assoc]
 * @return {RelativePosition}
 *
 * @function
 */
export const createRelativePositionFromTypeIndex = (type: AbstractType<any>, index: number, assoc: number = 0): RelativePosition => {
    let t = type._start
    if (assoc < 0) {
        // associated to the left character or the beginning of a type, increment index if possible.
        if (index === 0) {
            return createRelativePosition(type, null, assoc)
        }
        index--
    }
    while (t !== null) {
        if (!t.deleted && t.countable) {
            if (t.length > index) {
                // case 1: found position somewhere in the linked list
                return createRelativePosition(type, createID(t.id.client, t.id.clock + index), assoc)
            }
            index -= t.length
        }
        if (t.right === null && assoc < 0) {
            // left-associated position, return last available id
            return createRelativePosition(type, t.lastId, assoc)
        }
        t = t.right
    }
    return createRelativePosition(type, null, assoc)
}

/**
 * @param {encoding.Encoder} encoder
 * @param {RelativePosition} rpos
 *
 * @function
 */
export const writeRelativePosition = (encoder: encoding.Encoder, rpos: RelativePosition) => {
    const { type, tname, item, assoc } = rpos
    if (item !== null) {
        encoding.writeVarUint(encoder, 0)
        writeID(encoder, item)
    } else if (tname !== null) {
        // case 2: found position at the end of the list and type is stored in y.share
        encoding.writeUint8(encoder, 1)
        encoding.writeVarString(encoder, tname)
    } else if (type !== null) {
        // case 3: found position at the end of the list and type is attached to an item
        encoding.writeUint8(encoder, 2)
        writeID(encoder, type)
    } else {
        throw error.unexpectedCase()
    }
    encoding.writeVarInt(encoder, assoc)
    return encoder
}

/**
 * @param {RelativePosition} rpos
 * @return {Uint8Array}
 */
export const encodeRelativePosition = (rpos: RelativePosition): Uint8Array => {
    const encoder = encoding.createEncoder()
    writeRelativePosition(encoder, rpos)
    return encoding.toUint8Array(encoder)
}

/**
 * @param {decoding.Decoder} decoder
 * @return {RelativePosition}
 *
 * @function
 */
export const readRelativePosition = (decoder: decoding.Decoder): RelativePosition => {
    let type = null
    let tname = null
    let itemID = null
    switch (decoding.readVarUint(decoder)) {
        case 0:
            // case 1: found position somewhere in the linked list
            itemID = readID(decoder)
            break
        case 1:
            // case 2: found position at the end of the list and type is stored in y.share
            tname = decoding.readVarString(decoder)
            break
        case 2: {
            // case 3: found position at the end of the list and type is attached to an item
            type = readID(decoder)
        }
    }
    const assoc = decoding.hasContent(decoder) ? decoding.readVarInt(decoder) : 0
    return new RelativePosition(type, tname, itemID, assoc)
}

/**
 * @param {Uint8Array} uint8Array
 * @return {RelativePosition}
 */
export const decodeRelativePosition = (uint8Array: Uint8Array): RelativePosition => readRelativePosition(decoding.createDecoder(uint8Array))

/**
 * @param {RelativePosition} rpos
 * @param {Doc} doc
 * @return {AbsolutePosition|null}
 *
 * @function
 */
export const createAbsolutePositionFromRelativePosition = (rpos: RelativePosition, doc: Doc): AbsolutePosition | null => {
    const store = doc.store
    const rightID = rpos.item
    const typeID = rpos.type
    const tname = rpos.tname
    const assoc = rpos.assoc
    let type = null
    let index = 0
    if (rightID !== null) {
        if (getState(store, rightID.client) <= rightID.clock) {
            return null
        }
        const res = followRedone(store, rightID)
        const right = res.item
        if (!(right instanceof Item)) {
            return null
        }
        type = right.parent as AbstractType<any>
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
            if (getState(store, typeID.client) <= typeID.clock) {
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
            throw error.unexpectedCase()
        }
        if (assoc >= 0) {
            index = type._length
        } else {
            index = 0
        }
    }
    return createAbsolutePosition(type, index, rpos.assoc)
}

/**
 * @param {RelativePosition|null} a
 * @param {RelativePosition|null} b
 * @return {boolean}
 *
 * @function
 */
export const compareRelativePositions = (a: RelativePosition | null, b: RelativePosition | null): boolean => a === b || (
    a !== null && b !== null && a.tname === b.tname && compareIDs(a.item, b.item) && compareIDs(a.type, b.type) && a.assoc === b.assoc
)
