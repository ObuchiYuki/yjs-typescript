import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
export declare class ID {
    /** Client id */
    client: number;
    /** unique per client id, continuous number */
    clock: number;
    constructor(client: number, clock: number);
    encode(encoder: encoding.Encoder): void;
    static decode(decoder: decoding.Decoder): ID;
}
export declare const compareIDs: (a: ID | null, b: ID | null) => boolean;
