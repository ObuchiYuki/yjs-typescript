/**
 * @module encoding
 */
import { UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, DSEncoderV2, DSDecoderV1, DSEncoderV1, DSDecoderV2, Doc, Transaction, GC, Item, StructStore, UpdateDecoderAny_ } from '../internals';
import * as decoding from 'lib0/decoding';
/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {StructStore} store
 * @param {Map<number,number>} _sm
 *
 * @private
 * @function
 */
export declare const writeClientsStructs: (encoder: UpdateEncoderV1 | UpdateEncoderV2, store: StructStore, _sm: Map<number, number>) => void;
export declare const readClientsStructRefs: (decoder: UpdateDecoderAny_, doc: Doc) => Map<number, {
    i: number;
    refs: Array<Item | GC>;
}>;
/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {Transaction} transaction
 *
 * @private
 * @function
 */
export declare const writeStructsFromTransaction: (encoder: UpdateEncoderV1 | UpdateEncoderV2, transaction: Transaction) => void;
/**
 * Read and apply a document update.
 *
 * This function has the same effect as `applyUpdate` but accepts an decoder.
 *
 * @param {decoding.Decoder} decoder
 * @param {Doc} ydoc
 * @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
 * @param {UpdateDecoderV1 | UpdateDecoderV2} [structDecoder]
 *
 * @function
 */
export declare const readUpdateV2: (decoder: decoding.Decoder, ydoc: Doc, transactionOrigin: any, structDecoder?: UpdateDecoderV1 | UpdateDecoderV2) => void;
/**
 * Read and apply a document update.
 *
 * This function has the same effect as `applyUpdate` but accepts an decoder.
 *
 * @param {decoding.Decoder} decoder
 * @param {Doc} ydoc
 * @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
 *
 * @function
 */
export declare const readUpdate: (decoder: decoding.Decoder, ydoc: Doc, transactionOrigin: any) => void;
/**
 * Apply a document update created by, for example, `y.on('update', update => ..)` or `update = encodeStateAsUpdate()`.
 *
 * This function has the same effect as `readUpdate` but accepts an Uint8Array instead of a Decoder.
 *
 * @param {Doc} ydoc
 * @param {Uint8Array} update
 * @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
 *
 * @function
 */
export declare const applyUpdateV2: (ydoc: Doc, update: Uint8Array, transactionOrigin?: any, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2) => void;
/**
 * Apply a document update created by, for example, `y.on('update', update => ..)` or `update = encodeStateAsUpdate()`.
 *
 * This function has the same effect as `readUpdate` but accepts an Uint8Array instead of a Decoder.
 *
 * @param {Doc} ydoc
 * @param {Uint8Array} update
 * @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
 *
 * @function
 */
export declare const applyUpdate: (ydoc: Doc, update: Uint8Array, transactionOrigin?: any) => void;
/**
 * Write all the document as a single update message. If you specify the state of the remote client (`targetStateVector`) it will
 * only write the operations that are missing.
 *
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {Doc} doc
 * @param {Map<number,number>} [targetStateVector] The state of the target that receives the update. Leave empty to write all known structs
 *
 * @function
 */
export declare const writeStateAsUpdate: (encoder: UpdateEncoderV1 | UpdateEncoderV2, doc: Doc, targetStateVector?: Map<number, number>) => void;
/**
 * Write all the document as a single update message that can be applied on the remote document. If you specify the state of the remote client (`targetState`) it will
 * only write the operations that are missing.
 *
 * Use `writeStateAsUpdate` instead if you are working with lib0/encoding.js#Encoder
 *
 * @param {Doc} doc
 * @param {Uint8Array} [encodedTargetStateVector] The state of the target that receives the update. Leave empty to write all known structs
 * @param {UpdateEncoderV1 | UpdateEncoderV2} [encoder]
 * @return {Uint8Array}
 *
 * @function
 */
export declare const encodeStateAsUpdateV2: (doc: Doc, encodedTargetStateVector?: Uint8Array, encoder?: UpdateEncoderV1 | UpdateEncoderV2) => Uint8Array;
/**
 * Write all the document as a single update message that can be applied on the remote document. If you specify the state of the remote client (`targetState`) it will
 * only write the operations that are missing.
 *
 * Use `writeStateAsUpdate` instead if you are working with lib0/encoding.js#Encoder
 *
 * @param {Doc} doc
 * @param {Uint8Array} [encodedTargetStateVector] The state of the target that receives the update. Leave empty to write all known structs
 * @return {Uint8Array}
 *
 * @function
 */
export declare const encodeStateAsUpdate: (doc: Doc, encodedTargetStateVector?: Uint8Array) => Uint8Array;
/**
 * Read state vector from Decoder and return as Map
 *
 * @param {DSDecoderV1 | DSDecoderV2} decoder
 * @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
 *
 * @function
 */
export declare const readStateVector: (decoder: DSDecoderV1 | DSDecoderV2) => Map<number, number>;
/**
 * Read decodedState and return State as Map.
 *
 * @param {Uint8Array} decodedState
 * @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
 *
 * @function
 */
/**
 * Read decodedState and return State as Map.
 *
 * @param {Uint8Array} decodedState
 * @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
 *
 * @function
 */
export declare const decodeStateVector: (decodedState: Uint8Array) => Map<number, number>;
/**
 * @param {DSEncoderV1 | DSEncoderV2} encoder
 * @param {Map<number,number>} sv
 * @function
 */
export declare const writeStateVector: (encoder: DSEncoderV1 | DSEncoderV2, sv: Map<number, number>) => DSEncoderV1 | DSEncoderV2;
/**
 * @param {DSEncoderV1 | DSEncoderV2} encoder
 * @param {Doc} doc
 *
 * @function
 */
export declare const writeDocumentStateVector: (encoder: DSEncoderV1 | DSEncoderV2, doc: Doc) => DSEncoderV1 | DSEncoderV2;
/**
 * Encode State as Uint8Array.
 *
 * @param {Doc|Map<number,number>} doc
 * @param {DSEncoderV1 | DSEncoderV2} [encoder]
 * @return {Uint8Array}
 *
 * @function
 */
export declare const encodeStateVectorV2: (doc: Doc | Map<number, number>, encoder?: DSEncoderV1 | DSEncoderV2) => Uint8Array;
/**
 * Encode State as Uint8Array.
 *
 * @param {Doc|Map<number,number>} doc
 * @return {Uint8Array}
 *
 * @function
 */
export declare const encodeStateVector: (doc: Doc | Map<number, number>) => Uint8Array;
