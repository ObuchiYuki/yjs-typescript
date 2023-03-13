"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertUpdateFormatV2ToV1 = exports.convertUpdateFormatV1ToV2 = exports.convertUpdateFormat = exports.diffUpdate = exports.diffUpdateV2 = exports.mergeUpdatesV2 = exports.parseUpdateMeta = exports.parseUpdateMetaV2 = exports.encodeStateVectorFromUpdate = exports.encodeStateVectorFromUpdateV2 = exports.mergeUpdates = exports.LazyStructWriter = exports.decodeUpdateV2 = exports.decodeUpdate = exports.logUpdateV2 = exports.logUpdate = exports.LazyStructReader = void 0;
const binary = require("lib0/binary");
const decoding = require("lib0/decoding");
const encoding = require("lib0/encoding");
const logging = require("lib0/logging");
const math = require("lib0/math");
const internals_1 = require("../internals");
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 */
function* lazyStructReaderGenerator(decoder) {
    const numOfStateUpdates = decoding.readVarUint(decoder.restDecoder);
    for (let i = 0; i < numOfStateUpdates; i++) {
        const numberOfStructs = decoding.readVarUint(decoder.restDecoder);
        const client = decoder.readClient();
        let clock = decoding.readVarUint(decoder.restDecoder);
        for (let i = 0; i < numberOfStructs; i++) {
            const info = decoder.readInfo();
            // @todo use switch instead of ifs
            if (info === 10) {
                const len = decoding.readVarUint(decoder.restDecoder);
                yield new internals_1.Skip((0, internals_1.createID)(client, clock), len);
                clock += len;
            }
            else if ((binary.BITS5 & info) !== 0) {
                const cantCopyParentInfo = (info & (binary.BIT7 | binary.BIT8)) === 0;
                // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
                // and we read the next string as parentYKey.
                // It indicates how we store/retrieve parent from `y.share`
                // @type {string|null}
                const struct = new internals_1.Item((0, internals_1.createID)(client, clock), null, // left
                (info & binary.BIT8) === binary.BIT8 ? decoder.readLeftID() : null, // origin
                null, // right
                (info & binary.BIT7) === binary.BIT7 ? decoder.readRightID() : null, // right origin
                // @ts-ignore Force writing a string here.
                cantCopyParentInfo ? (decoder.readParentInfo() ? decoder.readString() : decoder.readLeftID()) : null, // parent
                cantCopyParentInfo && (info & binary.BIT6) === binary.BIT6 ? decoder.readString() : null, // parentSub
                (0, internals_1.readItemContent)(decoder, info) // item content
                );
                yield struct;
                clock += struct.length;
            }
            else {
                const len = decoder.readLen();
                yield new internals_1.GC((0, internals_1.createID)(client, clock), len);
                clock += len;
            }
        }
    }
}
class LazyStructReader {
    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @param {boolean} filterSkips
     */
    constructor(decoder, filterSkips) {
        this.gen = lazyStructReaderGenerator(decoder);
        /**
         * @type {null | Item | Skip | GC}
         */
        this.curr = null;
        this.done = false;
        this.filterSkips = filterSkips;
        this.next();
    }
    /**
     * @return {Item | GC | Skip |null}
     */
    next() {
        // ignore "Skip" structs
        do {
            this.curr = this.gen.next().value || null;
        } while (this.filterSkips && this.curr !== null && this.curr.constructor === internals_1.Skip);
        return this.curr;
    }
}
exports.LazyStructReader = LazyStructReader;
/**
 * @param {Uint8Array} update
 *
 */
const logUpdate = (update) => (0, exports.logUpdateV2)(update, internals_1.UpdateDecoderV1);
exports.logUpdate = logUpdate;
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} [YDecoder]
 *
 */
const logUpdateV2 = (update, YDecoder = internals_1.UpdateDecoderV2) => {
    const structs = [];
    const updateDecoder = new YDecoder(decoding.createDecoder(update));
    const lazyDecoder = new LazyStructReader(updateDecoder, false);
    for (let curr = lazyDecoder.curr; curr !== null; curr = lazyDecoder.next()) {
        structs.push(curr);
    }
    logging.print('Structs: ', structs);
    const ds = internals_1.DeleteSet.decode(updateDecoder);
    logging.print('DeleteSet: ', ds);
};
exports.logUpdateV2 = logUpdateV2;
/**
 * @param {Uint8Array} update
 *
 */
const decodeUpdate = (update) => (0, exports.decodeUpdateV2)(update, internals_1.UpdateDecoderV1);
exports.decodeUpdate = decodeUpdate;
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} [YDecoder]
 *
 */
const decodeUpdateV2 = (update, YDecoder = internals_1.UpdateDecoderV2) => {
    const structs = [];
    const updateDecoder = new YDecoder(decoding.createDecoder(update));
    const lazyDecoder = new LazyStructReader(updateDecoder, false);
    for (let curr = lazyDecoder.curr; curr !== null; curr = lazyDecoder.next()) {
        structs.push(curr);
    }
    return {
        structs,
        ds: internals_1.DeleteSet.decode(updateDecoder)
    };
};
exports.decodeUpdateV2 = decodeUpdateV2;
class LazyStructWriter {
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     */
    constructor(encoder) {
        this.currClient = 0;
        this.startClock = 0;
        this.written = 0;
        this.encoder = encoder;
        /**
         * We want to write operations lazily, but also we need to know beforehand how many operations we want to write for each client.
         *
         * This kind of meta-information (#clients, #structs-per-client-written) is written to the restEncoder.
         *
         * We fragment the restEncoder and store a slice of it per-client until we know how many clients there are.
         * When we flush (toUint8Array) we write the restEncoder using the fragments and the meta-information.
         *
         * @type {Array<{ written: number, restEncoder: Uint8Array }>}
         */
        this.clientStructs = [];
    }
}
exports.LazyStructWriter = LazyStructWriter;
/**
 * @param {Array<Uint8Array>} updates
 * @return {Uint8Array}
 */
const mergeUpdates = (updates) => (0, exports.mergeUpdatesV2)(updates, internals_1.UpdateDecoderV1, internals_1.UpdateEncoderV1);
exports.mergeUpdates = mergeUpdates;
/**
 * @param {Uint8Array} update
 * @param {typeof DSEncoderV1 | typeof DSEncoderV2} YEncoder
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} YDecoder
 * @return {Uint8Array}
 */
const encodeStateVectorFromUpdateV2 = (update, YEncoder = internals_1.DSEncoderV2, YDecoder = internals_1.UpdateDecoderV2) => {
    const encoder = new YEncoder();
    const updateDecoder = new LazyStructReader(new YDecoder(decoding.createDecoder(update)), false);
    let curr = updateDecoder.curr;
    if (curr !== null) {
        let size = 0;
        let currClient = curr.id.client;
        let stopCounting = curr.id.clock !== 0; // must start at 0
        let currClock = stopCounting ? 0 : curr.id.clock + curr.length;
        for (; curr !== null; curr = updateDecoder.next()) {
            if (currClient !== curr.id.client) {
                if (currClock !== 0) {
                    size++;
                    // We found a new client
                    // write what we have to the encoder
                    encoding.writeVarUint(encoder.restEncoder, currClient);
                    encoding.writeVarUint(encoder.restEncoder, currClock);
                }
                currClient = curr.id.client;
                currClock = 0;
                stopCounting = curr.id.clock !== 0;
            }
            // we ignore skips
            if (curr.constructor === internals_1.Skip) {
                stopCounting = true;
            }
            if (!stopCounting) {
                currClock = curr.id.clock + curr.length;
            }
        }
        // write what we have
        if (currClock !== 0) {
            size++;
            encoding.writeVarUint(encoder.restEncoder, currClient);
            encoding.writeVarUint(encoder.restEncoder, currClock);
        }
        // prepend the size of the state vector
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, size);
        encoding.writeBinaryEncoder(enc, encoder.restEncoder);
        encoder.restEncoder = enc;
        return encoder.toUint8Array();
    }
    else {
        encoding.writeVarUint(encoder.restEncoder, 0);
        return encoder.toUint8Array();
    }
};
exports.encodeStateVectorFromUpdateV2 = encodeStateVectorFromUpdateV2;
/**
 * @param {Uint8Array} update
 * @return {Uint8Array}
 */
const encodeStateVectorFromUpdate = (update) => (0, exports.encodeStateVectorFromUpdateV2)(update, internals_1.DSEncoderV1, internals_1.UpdateDecoderV1);
exports.encodeStateVectorFromUpdate = encodeStateVectorFromUpdate;
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} YDecoder
 * @return {{ from: Map<number,number>, to: Map<number,number> }}
 */
const parseUpdateMetaV2 = (update, YDecoder = internals_1.UpdateDecoderV2) => {
    /**
     * @type {Map<number, number>}
     */
    const from = new Map();
    /**
     * @type {Map<number, number>}
     */
    const to = new Map();
    const updateDecoder = new LazyStructReader(new YDecoder(decoding.createDecoder(update)), false);
    let curr = updateDecoder.curr;
    if (curr !== null) {
        let currClient = curr.id.client;
        let currClock = curr.id.clock;
        // write the beginning to `from`
        from.set(currClient, currClock);
        for (; curr !== null; curr = updateDecoder.next()) {
            if (currClient !== curr.id.client) {
                // We found a new client
                // write the end to `to`
                to.set(currClient, currClock);
                // write the beginning to `from`
                from.set(curr.id.client, curr.id.clock);
                // update currClient
                currClient = curr.id.client;
            }
            currClock = curr.id.clock + curr.length;
        }
        // write the end to `to`
        to.set(currClient, currClock);
    }
    return { from, to };
};
exports.parseUpdateMetaV2 = parseUpdateMetaV2;
/**
 * @param {Uint8Array} update
 * @return {{ from: Map<number,number>, to: Map<number,number> }}
 */
const parseUpdateMeta = (update) => (0, exports.parseUpdateMetaV2)(update, internals_1.UpdateDecoderV1);
exports.parseUpdateMeta = parseUpdateMeta;
/**
 * This method is intended to slice any kind of struct and retrieve the right part.
 * It does not handle side-effects, so it should only be used by the lazy-encoder.
 *
 * @param {Item | GC | Skip} left
 * @param {number} diff
 * @return {Item | GC}
 */
const sliceStruct = (left, diff) => {
    if (left.constructor === internals_1.GC) {
        const { client, clock } = left.id;
        return new internals_1.GC((0, internals_1.createID)(client, clock + diff), left.length - diff);
    }
    else if (left.constructor === internals_1.Skip) {
        const { client, clock } = left.id;
        return new internals_1.Skip((0, internals_1.createID)(client, clock + diff), left.length - diff);
    }
    else {
        const leftItem = left;
        const { client, clock } = leftItem.id;
        return new internals_1.Item((0, internals_1.createID)(client, clock + diff), null, (0, internals_1.createID)(client, clock + diff - 1), null, leftItem.rightOrigin, leftItem.parent, leftItem.parentSub, leftItem.content.splice(diff));
    }
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
const mergeUpdatesV2 = (updates, YDecoder = internals_1.UpdateDecoderV2, YEncoder = internals_1.UpdateEncoderV2) => {
    if (updates.length === 1) {
        return updates[0];
    }
    const updateDecoders = updates.map(update => new YDecoder(decoding.createDecoder(update)));
    let lazyStructDecoders = updateDecoders.map(decoder => new LazyStructReader(decoder, true));
    /**
     * @todo we don't need offset because we always slice before
     * @type {null | { struct: Item | GC | Skip, offset: number }}
     */
    let currWrite = null;
    const updateEncoder = new YEncoder();
    // write structs lazily
    const lazyStructEncoder = new LazyStructWriter(updateEncoder);
    // Note: We need to ensure that all lazyStructDecoders are fully consumed
    // Note: Should merge document updates whenever possible - even from different updates
    // Note: Should handle that some operations cannot be applied yet ()
    while (true) {
        // Write higher clients first ⇒ sort by clientID & clock and remove decoders without content
        lazyStructDecoders = lazyStructDecoders.filter(dec => dec.curr !== null);
        lazyStructDecoders.sort((dec1, dec2) => {
            if (dec1.curr.id.client === dec2.curr.id.client) {
                const clockDiff = dec1.curr.id.clock - dec2.curr.id.clock;
                if (clockDiff === 0) {
                    // @todo remove references to skip since the structDecoders must filter Skips.
                    return dec1.curr.constructor === dec2.curr.constructor
                        ? 0
                        : dec1.curr.constructor === internals_1.Skip ? 1 : -1; // we are filtering skips anyway.
                }
                else {
                    return clockDiff;
                }
            }
            else {
                return dec2.curr.id.client - dec1.curr.id.client;
            }
        });
        if (lazyStructDecoders.length === 0) {
            break;
        }
        const currDecoder = lazyStructDecoders[0];
        // write from currDecoder until the next operation is from another client or if filler-struct
        // then we need to reorder the decoders and find the next operation to write
        const firstClient = currDecoder.curr.id.client;
        if (currWrite !== null) {
            let curr = (currDecoder.curr);
            let iterated = false;
            // iterate until we find something that we haven't written already
            // remember: first the high client-ids are written
            while (curr !== null && curr.id.clock + curr.length <= currWrite.struct.id.clock + currWrite.struct.length && curr.id.client >= currWrite.struct.id.client) {
                curr = currDecoder.next();
                iterated = true;
            }
            if (curr === null || // current decoder is empty
                curr.id.client !== firstClient || // check whether there is another decoder that has has updates from `firstClient`
                (iterated && curr.id.clock > currWrite.struct.id.clock + currWrite.struct.length) // the above while loop was used and we are potentially missing updates
            ) {
                continue;
            }
            if (firstClient !== currWrite.struct.id.client) {
                writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
                currWrite = { struct: curr, offset: 0 };
                currDecoder.next();
            }
            else {
                if (currWrite.struct.id.clock + currWrite.struct.length < curr.id.clock) {
                    // @todo write currStruct & set currStruct = Skip(clock = currStruct.id.clock + currStruct.length, length = curr.id.clock - self.clock)
                    if (currWrite.struct.constructor === internals_1.Skip) {
                        // extend existing skip
                        currWrite.struct.length = curr.id.clock + curr.length - currWrite.struct.id.clock;
                    }
                    else {
                        writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
                        const diff = curr.id.clock - currWrite.struct.id.clock - currWrite.struct.length;
                        /**
                         * @type {Skip}
                         */
                        const struct = new internals_1.Skip((0, internals_1.createID)(firstClient, currWrite.struct.id.clock + currWrite.struct.length), diff);
                        currWrite = { struct, offset: 0 };
                    }
                }
                else { // if (currWrite.struct.id.clock + currWrite.struct.length >= curr.id.clock) {
                    const diff = currWrite.struct.id.clock + currWrite.struct.length - curr.id.clock;
                    if (diff > 0) {
                        if (currWrite.struct.constructor === internals_1.Skip) {
                            // prefer to slice Skip because the other struct might contain more information
                            currWrite.struct.length -= diff;
                        }
                        else {
                            curr = sliceStruct(curr, diff);
                        }
                    }
                    if (!currWrite.struct.mergeWith(curr)) {
                        writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
                        currWrite = { struct: curr, offset: 0 };
                        currDecoder.next();
                    }
                }
            }
        }
        else {
            currWrite = { struct: currDecoder.curr, offset: 0 };
            currDecoder.next();
        }
        for (let next = currDecoder.curr; next !== null && next.id.client === firstClient && next.id.clock === currWrite.struct.id.clock + currWrite.struct.length && next.constructor !== internals_1.Skip; next = currDecoder.next()) {
            writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
            currWrite = { struct: next, offset: 0 };
        }
    }
    if (currWrite !== null) {
        writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
        currWrite = null;
    }
    finishLazyStructWriting(lazyStructEncoder);
    const dss = updateDecoders.map(decoder => internals_1.DeleteSet.decode(decoder));
    const ds = internals_1.DeleteSet.mergeAll(dss);
    ds.encode(updateEncoder);
    return updateEncoder.toUint8Array();
};
exports.mergeUpdatesV2 = mergeUpdatesV2;
/**
 * @param {Uint8Array} update
 * @param {Uint8Array} sv
 * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
 * @param {typeof UpdateEncoderV1 | typeof UpdateEncoderV2} [YEncoder]
 */
const diffUpdateV2 = (update, sv, YDecoder = internals_1.UpdateDecoderV2, YEncoder = internals_1.UpdateEncoderV2) => {
    const state = (0, internals_1.decodeStateVector)(sv);
    const encoder = new YEncoder();
    const lazyStructWriter = new LazyStructWriter(encoder);
    const decoder = new YDecoder(decoding.createDecoder(update));
    const reader = new LazyStructReader(decoder, false);
    while (reader.curr) {
        const curr = reader.curr;
        const currClient = curr.id.client;
        const svClock = state.get(currClient) || 0;
        if (reader.curr.constructor === internals_1.Skip) {
            // the first written struct shouldn't be a skip
            reader.next();
            continue;
        }
        if (curr.id.clock + curr.length > svClock) {
            writeStructToLazyStructWriter(lazyStructWriter, curr, math.max(svClock - curr.id.clock, 0));
            reader.next();
            while (reader.curr && reader.curr.id.client === currClient) {
                writeStructToLazyStructWriter(lazyStructWriter, reader.curr, 0);
                reader.next();
            }
        }
        else {
            // read until something new comes up
            while (reader.curr && reader.curr.id.client === currClient && reader.curr.id.clock + reader.curr.length <= svClock) {
                reader.next();
            }
        }
    }
    finishLazyStructWriting(lazyStructWriter);
    // write ds
    const ds = internals_1.DeleteSet.decode(decoder);
    ds.encode(encoder);
    return encoder.toUint8Array();
};
exports.diffUpdateV2 = diffUpdateV2;
/**
 * @param {Uint8Array} update
 * @param {Uint8Array} sv
 */
const diffUpdate = (update, sv) => (0, exports.diffUpdateV2)(update, sv, internals_1.UpdateDecoderV1, internals_1.UpdateEncoderV1);
exports.diffUpdate = diffUpdate;
/**
 * @param {LazyStructWriter} lazyWriter
 */
const flushLazyStructWriter = (lazyWriter) => {
    if (lazyWriter.written > 0) {
        lazyWriter.clientStructs.push({ written: lazyWriter.written, restEncoder: encoding.toUint8Array(lazyWriter.encoder.restEncoder) });
        lazyWriter.encoder.restEncoder = encoding.createEncoder();
        lazyWriter.written = 0;
    }
};
/**
 * @param {LazyStructWriter} lazyWriter
 * @param {Item | GC} struct
 * @param {number} offset
 */
const writeStructToLazyStructWriter = (lazyWriter, struct, offset) => {
    // flush curr if we start another client
    if (lazyWriter.written > 0 && lazyWriter.currClient !== struct.id.client) {
        flushLazyStructWriter(lazyWriter);
    }
    if (lazyWriter.written === 0) {
        lazyWriter.currClient = struct.id.client;
        // write next client
        lazyWriter.encoder.writeClient(struct.id.client);
        // write startClock
        encoding.writeVarUint(lazyWriter.encoder.restEncoder, struct.id.clock + offset);
    }
    struct.write(lazyWriter.encoder, offset);
    lazyWriter.written++;
};
/**
 * Call this function when we collected all parts and want to
 * put all the parts together. After calling this method,
 * you can continue using the UpdateEncoder.
 *
 * @param {LazyStructWriter} lazyWriter
 */
const finishLazyStructWriting = (lazyWriter) => {
    flushLazyStructWriter(lazyWriter);
    // this is a fresh encoder because we called flushCurr
    const restEncoder = lazyWriter.encoder.restEncoder;
    /**
     * Now we put all the fragments together.
     * This works similarly to `writeClientsStructs`
     */
    // write # states that were updated - i.e. the clients
    encoding.writeVarUint(restEncoder, lazyWriter.clientStructs.length);
    for (let i = 0; i < lazyWriter.clientStructs.length; i++) {
        const partStructs = lazyWriter.clientStructs[i];
        /**
         * Works similarly to `writeStructs`
         */
        // write # encoded structs
        encoding.writeVarUint(restEncoder, partStructs.written);
        // write the rest of the fragment
        encoding.writeUint8Array(restEncoder, partStructs.restEncoder);
    }
};
/**
 * @param {Uint8Array} update
 * @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} YDecoder
 * @param {typeof UpdateEncoderV2 | typeof UpdateEncoderV1 } YEncoder
 */
const convertUpdateFormat = (update, YDecoder, YEncoder) => {
    const updateDecoder = new YDecoder(decoding.createDecoder(update));
    const lazyDecoder = new LazyStructReader(updateDecoder, false);
    const updateEncoder = new YEncoder();
    const lazyWriter = new LazyStructWriter(updateEncoder);
    for (let curr = lazyDecoder.curr; curr !== null; curr = lazyDecoder.next()) {
        writeStructToLazyStructWriter(lazyWriter, curr, 0);
    }
    finishLazyStructWriting(lazyWriter);
    const ds = internals_1.DeleteSet.decode(updateDecoder);
    ds.encode(updateEncoder);
    return updateEncoder.toUint8Array();
};
exports.convertUpdateFormat = convertUpdateFormat;
/**
 * @param {Uint8Array} update
 */
const convertUpdateFormatV1ToV2 = (update) => (0, exports.convertUpdateFormat)(update, internals_1.UpdateDecoderV1, internals_1.UpdateEncoderV2);
exports.convertUpdateFormatV1ToV2 = convertUpdateFormatV1ToV2;
/**
 * @param {Uint8Array} update
 */
const convertUpdateFormatV2ToV1 = (update) => (0, exports.convertUpdateFormat)(update, internals_1.UpdateDecoderV2, internals_1.UpdateEncoderV1);
exports.convertUpdateFormatV2ToV1 = convertUpdateFormatV2ToV1;
