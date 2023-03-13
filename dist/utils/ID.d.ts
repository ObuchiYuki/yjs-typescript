import { AbstractType_ } from '../internals';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
export declare class ID {
    /** Client id */
    client: number;
    /** unique per client id, continuous number */
    clock: number;
    /**
     * @param {number} client client id
     * @param {number} clock unique per client id, continuous number
     */
    constructor(client: number, clock: number);
}
/**
 * @param {ID | null} a
 * @param {ID | null} b
 * @return {boolean}
 *
 * @function
 */
export declare const compareIDs: (a: ID | null, b: ID | null) => boolean;
/**
 * @param {number} client
 * @param {number} clock
 *
 * @private
 * @function
 */
export declare const createID: (client: number, clock: number) => ID;
/**
 * @param {encoding.Encoder} encoder
 * @param {ID} id
 *
 * @private
 * @function
 */
export declare const writeID: (encoder: encoding.Encoder, id: ID) => void;
/**
 * Read ID.
 * * If first varUint read is 0xFFFFFF a RootID is returned.
 * * Otherwise an ID is returned
 *
 * @param {decoding.Decoder} decoder
 * @return {ID}
 *
 * @private
 * @function
 */
export declare const readID: (decoder: decoding.Decoder) => ID;
/**
 * The top types are mapped from y.share.get(keyname) => type.
 * `type` does not store any information about the `keyname`.
 * This function finds the correct `keyname` for `type` and throws otherwise.
 *
 * @param {AbstractType_<any>} type
 * @return {string}
 *
 * @private
 * @function
 */
export declare const findRootTypeKey: (type: AbstractType_<any>) => string;
