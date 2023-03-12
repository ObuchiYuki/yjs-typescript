import { ID, Doc, AbstractType } from '../internals';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
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
export declare class RelativePosition {
    type: ID | null;
    tname: string | null;
    item: ID | null;
    assoc: number;
    /**
     * @param {ID|null} type
     * @param {string|null} tname
     * @param {ID|null} item
     * @param {number} assoc
     */
    constructor(type: ID | null, tname: string | null, item: ID | null, assoc?: number);
}
/**
 * @param {RelativePosition} rpos
 * @return {any}
 */
export declare const relativePositionToJSON: (rpos: RelativePosition) => any;
/**
 * @param {any} json
 * @return {RelativePosition}
 *
 * @function
 */
export declare const createRelativePositionFromJSON: (json: any) => RelativePosition;
export declare class AbsolutePosition {
    type: AbstractType<any>;
    index: number;
    assoc: number;
    constructor(type: AbstractType<any>, index: number, assoc?: number);
}
/**
 * @param {AbstractType<any>} type
 * @param {number} index
 * @param {number} [assoc]
 *
 * @function
 */
export declare const createAbsolutePosition: (type: AbstractType<any>, index: number, assoc?: number) => AbsolutePosition;
/**
 * @param {AbstractType<any>} type
 * @param {ID|null} item
 * @param {number} [assoc]
 *
 * @function
 */
export declare const createRelativePosition: (type: AbstractType<any>, item: ID | null, assoc: number) => RelativePosition;
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
export declare const createRelativePositionFromTypeIndex: (type: AbstractType<any>, index: number, assoc?: number) => RelativePosition;
/**
 * @param {encoding.Encoder} encoder
 * @param {RelativePosition} rpos
 *
 * @function
 */
export declare const writeRelativePosition: (encoder: encoding.Encoder, rpos: RelativePosition) => encoding.Encoder;
/**
 * @param {RelativePosition} rpos
 * @return {Uint8Array}
 */
export declare const encodeRelativePosition: (rpos: RelativePosition) => Uint8Array;
/**
 * @param {decoding.Decoder} decoder
 * @return {RelativePosition}
 *
 * @function
 */
export declare const readRelativePosition: (decoder: decoding.Decoder) => RelativePosition;
/**
 * @param {Uint8Array} uint8Array
 * @return {RelativePosition}
 */
export declare const decodeRelativePosition: (uint8Array: Uint8Array) => RelativePosition;
/**
 * @param {RelativePosition} rpos
 * @param {Doc} doc
 * @return {AbsolutePosition|null}
 *
 * @function
 */
export declare const createAbsolutePositionFromRelativePosition: (rpos: RelativePosition, doc: Doc) => AbsolutePosition | null;
/**
 * @param {RelativePosition|null} a
 * @param {RelativePosition|null} b
 * @return {boolean}
 *
 * @function
 */
export declare const compareRelativePositions: (a: RelativePosition | null, b: RelativePosition | null) => boolean;
