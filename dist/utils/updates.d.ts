import { Skip, DSEncoderV1, DSEncoderV2, Item, GC, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2 } from '../internals';
export declare class LazyStructReader {
    gen: Generator<Item | Skip | GC, void, unknown>;
    curr: null | Item | Skip | GC;
    done: boolean;
    filterSkips: boolean;
    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @param {boolean} filterSkips
     */
    constructor(decoder: UpdateDecoderV1 | UpdateDecoderV2, filterSkips: boolean);
    /**
     * @return {Item | GC | Skip |null}
     */
    next(): Item | GC | Skip | null;
}
/**
 * @param {Uint8Array} update
 *
 */
export declare const logUpdate: (update: Uint8Array) => void;
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} [YDecoder]
 *
 */
export declare const logUpdateV2: (update: Uint8Array, YDecoder?: typeof UpdateDecoderV2 | typeof UpdateDecoderV1) => void;
/**
 * @param {Uint8Array} update
 *
 */
export declare const decodeUpdate: (update: Uint8Array) => {
    structs: (GC | Item | Skip)[];
    ds: import("./DeleteSet").DeleteSet;
};
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} [YDecoder]
 *
 */
export declare const decodeUpdateV2: (update: Uint8Array, YDecoder?: typeof UpdateDecoderV2 | typeof UpdateDecoderV1) => {
    structs: (GC | Item | Skip)[];
    ds: import("./DeleteSet").DeleteSet;
};
export declare class LazyStructWriter {
    currClient: number;
    startClock: number;
    written: number;
    encoder: UpdateEncoderV1 | UpdateEncoderV2;
    clientStructs: Array<{
        written: number;
        restEncoder: Uint8Array;
    }>;
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     */
    constructor(encoder: UpdateEncoderV1 | UpdateEncoderV2);
}
/**
 * @param {Array<Uint8Array>} updates
 * @return {Uint8Array}
 */
export declare const mergeUpdates: (updates: Array<Uint8Array>) => Uint8Array;
/**
 * @param {Uint8Array} update
 * @param {typeof DSEncoderV1 | typeof DSEncoderV2} YEncoder
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} YDecoder
 * @return {Uint8Array}
 */
export declare const encodeStateVectorFromUpdateV2: (update: Uint8Array, YEncoder?: typeof DSEncoderV1 | typeof DSEncoderV2, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2) => Uint8Array;
/**
 * @param {Uint8Array} update
 * @return {Uint8Array}
 */
export declare const encodeStateVectorFromUpdate: (update: Uint8Array) => Uint8Array;
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} YDecoder
 * @return {{ from: Map<number,number>, to: Map<number,number> }}
 */
export declare const parseUpdateMetaV2: (update: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2) => {
    from: Map<number, number>;
    to: Map<number, number>;
};
/**
 * @param {Uint8Array} update
 * @return {{ from: Map<number,number>, to: Map<number,number> }}
 */
export declare const parseUpdateMeta: (update: Uint8Array) => {
    from: Map<number, number>;
    to: Map<number, number>;
};
/**
 *
 * This function works similarly to `readUpdateV2`.
 *
 * @param {Array<Uint8Array>} updates
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
 * @param {typeof UpdateEncoderV1 | typeof UpdateEncoderV2} [YEncoder]
 * @return {Uint8Array}
 */
export declare const mergeUpdatesV2: (updates: Array<Uint8Array>, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2, YEncoder?: typeof UpdateEncoderV1 | typeof UpdateEncoderV2) => Uint8Array;
/**
 * @param {Uint8Array} update
 * @param {Uint8Array} sv
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
 * @param {typeof UpdateEncoderV1 | typeof UpdateEncoderV2} [YEncoder]
 */
export declare const diffUpdateV2: (update: Uint8Array, sv: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2, YEncoder?: typeof UpdateEncoderV1 | typeof UpdateEncoderV2) => Uint8Array;
/**
 * @param {Uint8Array} update
 * @param {Uint8Array} sv
 */
export declare const diffUpdate: (update: Uint8Array, sv: Uint8Array) => Uint8Array;
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} YDecoder
 * @param {typeof UpdateEncoderV2 | typeof UpdateEncoderV1 } YEncoder
 */
export declare const convertUpdateFormat: (update: Uint8Array, YDecoder: typeof UpdateDecoderV2 | typeof UpdateDecoderV1, YEncoder: typeof UpdateEncoderV2 | typeof UpdateEncoderV1) => Uint8Array;
/**
 * @param {Uint8Array} update
 */
export declare const convertUpdateFormatV1ToV2: (update: Uint8Array) => Uint8Array;
/**
 * @param {Uint8Array} update
 */
export declare const convertUpdateFormatV2ToV1: (update: Uint8Array) => Uint8Array;
