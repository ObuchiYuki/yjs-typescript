import { ID, Doc, AbstractType_ } from '../internals';
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
    constructor(type: ID | null, tname: string | null, item: ID | null, assoc?: number);
    toJSON(): {
        [s: string]: any;
    };
    encode(): Uint8Array;
    static decode(uint8Array: Uint8Array): RelativePosition;
    static fromJSON(json: {
        [s: string]: any;
    }): RelativePosition;
    static fromType(type: AbstractType_<any>, item: ID | null, assoc: number): RelativePosition;
    /**
     * Create a relativePosition based on a absolute position.
     *
     * @param {AbstractType_<any>} type The base type (e.g. YText or YArray).
     * @param {number} index The absolute position.
     * @param {number} [assoc]
     */
    static fromTypeIndex(type: AbstractType_<any>, index: number, assoc?: number): RelativePosition;
}
export declare class AbsolutePosition {
    type: AbstractType_<any>;
    index: number;
    assoc: number;
    constructor(type: AbstractType_<any>, index: number, assoc?: number);
    static fromRelativePosition(rpos: RelativePosition, doc: Doc): AbsolutePosition | null;
}
export declare const compareRelativePositions: (a: RelativePosition | null, b: RelativePosition | null) => boolean;
