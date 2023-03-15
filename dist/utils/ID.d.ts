import * as lib0 from 'lib0-typescript';
export declare class ID {
    /** Client id */
    client: number;
    /** unique per client id, continuous number */
    clock: number;
    constructor(client: number, clock: number);
    encode(encoder: lib0.Encoder): void;
    static decode(decoder: lib0.Decoder): ID;
}
export declare const compareIDs: (a: ID | null, b: ID | null) => boolean;
