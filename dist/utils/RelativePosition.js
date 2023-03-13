"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareRelativePositions = exports.createAbsolutePositionFromRelativePosition = exports.decodeRelativePosition = exports.readRelativePosition = exports.encodeRelativePosition = exports.writeRelativePosition = exports.createRelativePositionFromTypeIndex = exports.createRelativePosition = exports.createAbsolutePosition = exports.AbsolutePosition = exports.createRelativePositionFromJSON = exports.relativePositionToJSON = exports.RelativePosition = void 0;
const internals_1 = require("../internals");
const encoding = require("lib0/encoding");
const decoding = require("lib0/decoding");
const error = require("lib0/error");
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
class RelativePosition {
    /**
     * @param {ID|null} type
     * @param {string|null} tname
     * @param {ID|null} item
     * @param {number} assoc
     */
    constructor(type, tname, item, assoc = 0) {
        this.type = type;
        this.tname = tname;
        this.item = item;
        /**
         * A relative position is associated to a specific character. By default
         * assoc >= 0, the relative position is associated to the character
         * after the meant position.
         * I.e. position 1 in 'ab' is associated to character 'b'.
         *
         * If assoc < 0, then the relative position is associated to the caharacter
         * before the meant position.
         */
        this.assoc = assoc;
    }
}
exports.RelativePosition = RelativePosition;
/**
 * @param {RelativePosition} rpos
 * @return {any}
 */
const relativePositionToJSON = (rpos) => {
    const json = {};
    if (rpos.type) {
        json.type = rpos.type;
    }
    if (rpos.tname) {
        json.tname = rpos.tname;
    }
    if (rpos.item) {
        json.item = rpos.item;
    }
    if (rpos.assoc != null) {
        json.assoc = rpos.assoc;
    }
    return json;
};
exports.relativePositionToJSON = relativePositionToJSON;
/**
 * @param {any} json
 * @return {RelativePosition}
 *
 * @function
 */
const createRelativePositionFromJSON = (json) => {
    return new RelativePosition(json.type == null ? null : (0, internals_1.createID)(json.type.client, json.type.clock), json.tname || null, json.item == null ? null : (0, internals_1.createID)(json.item.client, json.item.clock), json.assoc == null ? 0 : json.assoc);
};
exports.createRelativePositionFromJSON = createRelativePositionFromJSON;
class AbsolutePosition {
    constructor(type, index, assoc = 0) {
        this.type = type;
        this.index = index;
        this.assoc = assoc;
    }
}
exports.AbsolutePosition = AbsolutePosition;
/**
 * @param {AbstractType_<any>} type
 * @param {number} index
 * @param {number} [assoc]
 *
 * @function
 */
const createAbsolutePosition = (type, index, assoc = 0) => {
    return new AbsolutePosition(type, index, assoc);
};
exports.createAbsolutePosition = createAbsolutePosition;
/**
 * @param {AbstractType_<any>} type
 * @param {ID|null} item
 * @param {number} [assoc]
 *
 * @function
 */
const createRelativePosition = (type, item, assoc) => {
    let typeid = null;
    let tname = null;
    if (type._item === null) {
        tname = (0, internals_1.findRootTypeKey)(type);
    }
    else {
        typeid = (0, internals_1.createID)(type._item.id.client, type._item.id.clock);
    }
    return new RelativePosition(typeid, tname, item, assoc);
};
exports.createRelativePosition = createRelativePosition;
/**
 * Create a relativePosition based on a absolute position.
 *
 * @param {AbstractType_<any>} type The base type (e.g. YText or YArray).
 * @param {number} index The absolute position.
 * @param {number} [assoc]
 * @return {RelativePosition}
 *
 * @function
 */
const createRelativePositionFromTypeIndex = (type, index, assoc = 0) => {
    let t = type._start;
    if (assoc < 0) {
        // associated to the left character or the beginning of a type, increment index if possible.
        if (index === 0) {
            return (0, exports.createRelativePosition)(type, null, assoc);
        }
        index--;
    }
    while (t !== null) {
        if (!t.deleted && t.countable) {
            if (t.length > index) {
                // case 1: found position somewhere in the linked list
                return (0, exports.createRelativePosition)(type, (0, internals_1.createID)(t.id.client, t.id.clock + index), assoc);
            }
            index -= t.length;
        }
        if (t.right === null && assoc < 0) {
            // left-associated position, return last available id
            return (0, exports.createRelativePosition)(type, t.lastID, assoc);
        }
        t = t.right;
    }
    return (0, exports.createRelativePosition)(type, null, assoc);
};
exports.createRelativePositionFromTypeIndex = createRelativePositionFromTypeIndex;
/**
 * @param {encoding.Encoder} encoder
 * @param {RelativePosition} rpos
 *
 * @function
 */
const writeRelativePosition = (encoder, rpos) => {
    const { type, tname, item, assoc } = rpos;
    if (item !== null) {
        encoding.writeVarUint(encoder, 0);
        (0, internals_1.writeID)(encoder, item);
    }
    else if (tname !== null) {
        // case 2: found position at the end of the list and type is stored in y.share
        encoding.writeUint8(encoder, 1);
        encoding.writeVarString(encoder, tname);
    }
    else if (type !== null) {
        // case 3: found position at the end of the list and type is attached to an item
        encoding.writeUint8(encoder, 2);
        (0, internals_1.writeID)(encoder, type);
    }
    else {
        throw error.unexpectedCase();
    }
    encoding.writeVarInt(encoder, assoc);
    return encoder;
};
exports.writeRelativePosition = writeRelativePosition;
/**
 * @param {RelativePosition} rpos
 * @return {Uint8Array}
 */
const encodeRelativePosition = (rpos) => {
    const encoder = encoding.createEncoder();
    (0, exports.writeRelativePosition)(encoder, rpos);
    return encoding.toUint8Array(encoder);
};
exports.encodeRelativePosition = encodeRelativePosition;
/**
 * @param {decoding.Decoder} decoder
 * @return {RelativePosition}
 *
 * @function
 */
const readRelativePosition = (decoder) => {
    let type = null;
    let tname = null;
    let itemID = null;
    switch (decoding.readVarUint(decoder)) {
        case 0:
            // case 1: found position somewhere in the linked list
            itemID = (0, internals_1.readID)(decoder);
            break;
        case 1:
            // case 2: found position at the end of the list and type is stored in y.share
            tname = decoding.readVarString(decoder);
            break;
        case 2: {
            // case 3: found position at the end of the list and type is attached to an item
            type = (0, internals_1.readID)(decoder);
        }
    }
    const assoc = decoding.hasContent(decoder) ? decoding.readVarInt(decoder) : 0;
    return new RelativePosition(type, tname, itemID, assoc);
};
exports.readRelativePosition = readRelativePosition;
/**
 * @param {Uint8Array} uint8Array
 * @return {RelativePosition}
 */
const decodeRelativePosition = (uint8Array) => (0, exports.readRelativePosition)(decoding.createDecoder(uint8Array));
exports.decodeRelativePosition = decodeRelativePosition;
/**
 * @param {RelativePosition} rpos
 * @param {Doc} doc
 * @return {AbsolutePosition|null}
 *
 * @function
 */
const createAbsolutePositionFromRelativePosition = (rpos, doc) => {
    const store = doc.store;
    const rightID = rpos.item;
    const typeID = rpos.type;
    const tname = rpos.tname;
    const assoc = rpos.assoc;
    let type = null;
    let index = 0;
    if (rightID !== null) {
        if ((0, internals_1.getState)(store, rightID.client) <= rightID.clock) {
            return null;
        }
        const res = (0, internals_1.followRedone)(store, rightID);
        const right = res.item;
        if (!(right instanceof internals_1.Item)) {
            return null;
        }
        type = right.parent;
        if (type._item === null || !type._item.deleted) {
            index = (right.deleted || !right.countable) ? 0 : (res.diff + (assoc >= 0 ? 0 : 1)); // adjust position based on left association if necessary
            let n = right.left;
            while (n !== null) {
                if (!n.deleted && n.countable) {
                    index += n.length;
                }
                n = n.left;
            }
        }
    }
    else {
        if (tname !== null) {
            type = doc.get(tname);
        }
        else if (typeID !== null) {
            if ((0, internals_1.getState)(store, typeID.client) <= typeID.clock) {
                // type does not exist yet
                return null;
            }
            const { item } = (0, internals_1.followRedone)(store, typeID);
            if (item instanceof internals_1.Item && item.content instanceof internals_1.ContentType) {
                type = item.content.type;
            }
            else {
                // struct is garbage collected
                return null;
            }
        }
        else {
            throw error.unexpectedCase();
        }
        if (assoc >= 0) {
            index = type._length;
        }
        else {
            index = 0;
        }
    }
    return (0, exports.createAbsolutePosition)(type, index, rpos.assoc);
};
exports.createAbsolutePositionFromRelativePosition = createAbsolutePositionFromRelativePosition;
/**
 * @param {RelativePosition|null} a
 * @param {RelativePosition|null} b
 * @return {boolean}
 *
 * @function
 */
const compareRelativePositions = (a, b) => a === b || (a !== null && b !== null && a.tname === b.tname && (0, internals_1.compareIDs)(a.item, b.item) && (0, internals_1.compareIDs)(a.type, b.type) && a.assoc === b.assoc);
exports.compareRelativePositions = compareRelativePositions;
