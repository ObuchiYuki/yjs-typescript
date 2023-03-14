
/**
 * @module encoding
 */
/*
 * We use the first five bits in the info flag for determining the type of the struct.
 *
 * 0: GC
 * 1: Item with Deleted content
 * 2: Item with JSON content
 * 3: Item with Binary content
 * 4: Item with String content
 * 5: Item with Embed content (for richtext content)
 * 6: Item with Format content (a formatting marker for richtext content)
 * 7: Item with Type
 */

import {
    readItemContent,
    UpdateDecoderV1,
    UpdateDecoderV2,
    UpdateEncoderV1,
    UpdateEncoderV2,
    DSEncoderV2,
    DSDecoderV1,
    DSEncoderV1,
    mergeUpdates,
    mergeUpdatesV2,
    Skip,
    diffUpdateV2,
    convertUpdateFormatV2ToV1,
    DSDecoderV2, Doc, Transaction, GC, Item, StructStore, // eslint-disable-line
    DeleteSet, ID
} from '../internals'

import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as binary from 'lib0/binary'
import * as map from 'lib0/map'
import * as math from 'lib0/math'
import * as array from 'lib0/array'

/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {Array<GC|Item>} structs All structs by `client`
 * @param {number} client
 * @param {number} clock write structs starting with `ID(client,clock)`
 *
 * @function
 */
const writeStructs = (encoder: UpdateEncoderV1 | UpdateEncoderV2, structs: Array<GC | Item>, client: number, clock: number) => {
    // write first id
    clock = math.max(clock, structs[0].id.clock) // make sure the first id exists
    const startNewStructs = StructStore.findIndexSS(structs, clock)
    // write # encoded structs
    encoding.writeVarUint(encoder.restEncoder, structs.length - startNewStructs)
    encoder.writeClient(client)
    encoding.writeVarUint(encoder.restEncoder, clock)
    const firstStruct = structs[startNewStructs]
    // write first struct with an offset
    firstStruct.write(encoder, clock - firstStruct.id.clock)
    for (let i = startNewStructs + 1; i < structs.length; i++) {
        structs[i].write(encoder, 0)
    }
}

/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {StructStore} store
 * @param {Map<number,number>} _sm
 *
 * @private
 * @function
 */
export const writeClientsStructs = (encoder: UpdateEncoderV1 | UpdateEncoderV2, store: StructStore, _sm: Map<number, number>) => {
    // we filter all valid _sm entries into sm
    const sm = new Map()
    _sm.forEach((clock, client) => {
        // only write if new structs are available
        if (store.getState(client) > clock) {
            sm.set(client, clock)
        }
    })
    store.getStateVector().forEach((clock, client) => {
        if (!_sm.has(client)) {
            sm.set(client, 0)
        }
    })
    // write # states that were updated
    encoding.writeVarUint(encoder.restEncoder, sm.size)
    // Write items with higher client ids first
    // This heavily improves the conflict algorithm.
    array.from(sm.entries()).sort((a, b) => b[0] - a[0]).forEach(([client, clock]) => {
        // @ts-ignore
        writeStructs(encoder, store.clients.get(client), client, clock)
    })
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder The decoder object to read data from.
 * @param {Doc} doc
 * @return {Map<number, { i: number, refs: Array<Item | GC> }>}
 *
 * @private
 * @function
 */
export const readClientsStructRefs = (decoder: UpdateDecoderV1 | UpdateDecoderV2, doc: Doc): Map<number, { i: number; refs: Array<Item | GC> }> => {
    /**
     * @type {Map<number, { i: number, refs: Array<Item | GC> }>}
     */
    const clientRefs: Map<number, { i: number; refs: Array<Item | GC> }> = map.create()
    const numOfStateUpdates = decoding.readVarUint(decoder.restDecoder)
    for (let i = 0; i < numOfStateUpdates; i++) {
        const numberOfStructs = decoding.readVarUint(decoder.restDecoder)
        /**
         * @type {Array<GC|Item>}
         */
        const refs: Array<GC | Item> = new Array(numberOfStructs)
        const client = decoder.readClient()
        let clock = decoding.readVarUint(decoder.restDecoder)
        // const start = performance.now()
        clientRefs.set(client, { i: 0, refs })
        for (let i = 0; i < numberOfStructs; i++) {
            const info = decoder.readInfo()
            switch (binary.BITS5 & info) {
                case 0: { // GC
                    const len = decoder.readLen()
                    refs[i] = new GC(new ID(client, clock), len)
                    clock += len
                    break
                }
                case 10: { // Skip Struct (nothing to apply)
                    // @todo we could reduce the amount of checks by adding Skip struct to clientRefs so we know that something is missing.
                    const len = decoding.readVarUint(decoder.restDecoder)
                    refs[i] = new Skip(new ID(client, clock), len)
                    clock += len
                    break
                }
                default: { // Item with content
                    /**
                     * The optimized implementation doesn't use any variables because inlining variables is faster.
                     * Below a non-optimized version is shown that implements the basic algorithm with
                     * a few comments
                     */
                    const cantCopyParentInfo = (info & (binary.BIT7 | binary.BIT8)) === 0
                    // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
                    // and we read the next string as parentYKey.
                    // It indicates how we store/retrieve parent from `y.share`
                    // @type {string|null}
                    const struct = new Item(
                        new ID(client, clock),
                        null, // leftd
                        (info & binary.BIT8) === binary.BIT8 ? decoder.readLeftID() : null, // origin
                        null, // right
                        (info & binary.BIT7) === binary.BIT7 ? decoder.readRightID() : null, // right origin
                        cantCopyParentInfo ? (decoder.readParentInfo() ? doc.get(decoder.readString()) : decoder.readLeftID()) : null, // parent
                        cantCopyParentInfo && (info & binary.BIT6) === binary.BIT6 ? decoder.readString() : null, // parentSub
                        readItemContent(decoder, info) // item content
                    )
                    /* A non-optimized implementation of the above algorithm:

                    // The item that was originally to the left of this item.
                    const origin = (info & binary.BIT8) === binary.BIT8 ? decoder.readLeftID() : null
                    // The item that was originally to the right of this item.
                    const rightOrigin = (info & binary.BIT7) === binary.BIT7 ? decoder.readRightID() : null
                    const cantCopyParentInfo = (info & (binary.BIT7 | binary.BIT8)) === 0
                    const hasParentYKey = cantCopyParentInfo ? decoder.readParentInfo() : false
                    // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
                    // and we read the next string as parentYKey.
                    // It indicates how we store/retrieve parent from `y.share`
                    // @type {string|null}
                    const parentYKey = cantCopyParentInfo && hasParentYKey ? decoder.readString() : null

                    const struct = new Item(
                        new ID(client, clock),
                        null, // leftd
                        origin, // origin
                        null, // right
                        rightOrigin, // right origin
                        cantCopyParentInfo && !hasParentYKey ? decoder.readLeftID() : (parentYKey !== null ? doc.get(parentYKey) : null), // parent
                        cantCopyParentInfo && (info & binary.BIT6) === binary.BIT6 ? decoder.readString() : null, // parentSub
                        readItemContent(decoder, info) // item content
                    )
                    */
                    refs[i] = struct
                    clock += struct.length
                }
            }
        }
        // console.log('time to read: ', performance.now() - start) // @todo remove
    }
    return clientRefs
}

/**
 * Resume computing structs generated by struct readers.
 *
 * While there is something to do, we integrate structs in this order
 * 1. top element on stack, if stack is not empty
 * 2. next element from current struct reader (if empty, use next struct reader)
 *
 * If struct causally depends on another struct (ref.missing), we put next reader of
 * `ref.id.client` on top of stack.
 *
 * At some point we find a struct that has no causal dependencies,
 * then we start emptying the stack.
 *
 * It is not possible to have circles: i.e. struct1 (from client1) depends on struct2 (from client2)
 * depends on struct3 (from client1). Therefore the max stack size is eqaul to `structReaders.length`.
 *
 * This method is implemented in a way so that we can resume computation if this update
 * causally depends on another update.
 *
 * @param {Transaction} transaction
 * @param {StructStore} store
 * @param {Map<number, { i: number, refs: (GC | Item)[] }>} clientsStructRefs
 * @return { null | { update: Uint8Array, missing: Map<number,number> } }
 *
 * @private
 * @function
 */
const integrateStructs = (transaction: Transaction, store: StructStore, clientsStructRefs: Map<number, { i: number; refs: (GC | Item)[] }>): null | { update: Uint8Array; missing: Map<number, number> } => {
    /**
     * @type {Array<Item | GC>}
     */
    const stack: Array<Item | GC> = []
    // sort them so that we take the higher id first, in case of conflicts the lower id will probably not conflict with the id from the higher user.
    let clientsStructRefsIds = array.from(clientsStructRefs.keys()).sort((a, b) => a - b)
    if (clientsStructRefsIds.length === 0) {
        return null
    }
    const getNextStructTarget = () => {
        if (clientsStructRefsIds.length === 0) {
            return null
        }
        let nextStructsTarget = (clientsStructRefs.get(clientsStructRefsIds[clientsStructRefsIds.length - 1]) as { i: number, refs: Array<GC|Item> })
        while (nextStructsTarget.refs.length === nextStructsTarget.i) {
            clientsStructRefsIds.pop()
            if (clientsStructRefsIds.length > 0) {
                nextStructsTarget = (clientsStructRefs.get(clientsStructRefsIds[clientsStructRefsIds.length - 1])) as { i: number, refs: Array<GC|Item> }
            } else {
                return null
            }
        }
        return nextStructsTarget
    }
    let curStructsTarget = getNextStructTarget()
    if (curStructsTarget === null && stack.length === 0) {
        return null
    }

    /**
     * @type {StructStore}
     */
    const restStructs: StructStore = new StructStore()
    const missingSV = new Map()
    /**
     * @param {number} client
     * @param {number} clock
     */
    const updateMissingSv = (client: number, clock: number) => {
        const mclock = missingSV.get(client)
        if (mclock == null || mclock > clock) {
            missingSV.set(client, clock)
        }
    }
    /**
     * @type {GC|Item}
     */
    let stackHead: GC | Item = (curStructsTarget as any).refs[(curStructsTarget as any).i++]
    // caching the state because it is used very often
    const state = new Map()

    const addStackToRestSS = () => {
        for (const item of stack) {
            const client = item.id.client
            const unapplicableItems = clientsStructRefs.get(client)
            if (unapplicableItems) {
                // decrement because we weren't able to apply previous operation
                unapplicableItems.i--
                restStructs.clients.set(client, unapplicableItems.refs.slice(unapplicableItems.i))
                clientsStructRefs.delete(client)
                unapplicableItems.i = 0
                unapplicableItems.refs = []
            } else {
                // item was the last item on clientsStructRefs and the field was already cleared. Add item to restStructs and continue
                restStructs.clients.set(client, [item])
            }
            // remove client from clientsStructRefsIds to prevent users from applying the same update again
            clientsStructRefsIds = clientsStructRefsIds.filter(c => c !== client)
        }
        stack.length = 0
    }

    // iterate over all struct readers until we are done
    while (true) {
        if (stackHead.constructor !== Skip) {
            const localClock = map.setIfUndefined(state, stackHead.id.client, () => store.getState(stackHead.id.client))
            const offset = localClock - stackHead.id.clock
            if (offset < 0) {
                // update from the same client is missing
                stack.push(stackHead)
                updateMissingSv(stackHead.id.client, stackHead.id.clock - 1)
                // hid a dead wall, add all items from stack to restSS
                addStackToRestSS()
            } else {
                const missing = stackHead.getMissing(transaction, store)
                if (missing !== null) {
                    stack.push(stackHead)
                    // get the struct reader that has the missing struct
                    
                    const structRefs: { refs: Array<GC | Item>, i: number } = clientsStructRefs.get(missing) || { refs: [], i: 0 }

                    if (structRefs.refs.length === structRefs.i) {
                        // This update message causally depends on another update message that doesn't exist yet
                        updateMissingSv( (missing), store.getState(missing))
                        addStackToRestSS()
                    } else {
                        stackHead = structRefs.refs[structRefs.i++]
                        continue
                    }
                } else if (offset === 0 || offset < stackHead.length) {
                    // all fine, apply the stackhead
                    stackHead.integrate(transaction, offset)
                    state.set(stackHead.id.client, stackHead.id.clock + stackHead.length)
                }
            }
        }
        // iterate to next stackHead
        if (stack.length > 0) {
            stackHead =  (stack.pop()) as GC|Item
        } else if (curStructsTarget !== null && curStructsTarget.i < curStructsTarget.refs.length) {
            stackHead = (curStructsTarget.refs[curStructsTarget.i++]) as GC|Item
        } else {
            curStructsTarget = getNextStructTarget()
            if (curStructsTarget === null) {
                // we are done!
                break
            } else {
                stackHead = (curStructsTarget.refs[curStructsTarget.i++]) as GC|Item
            }
        }
    }
    if (restStructs.clients.size > 0) {
        const encoder = new UpdateEncoderV2()
        writeClientsStructs(encoder, restStructs, new Map())
        // write empty deleteset
        // writeDeleteSet(encoder, new DeleteSet())
        encoding.writeVarUint(encoder.restEncoder, 0) // => no need for an extra function call, just write 0 deletes
        return { missing: missingSV, update: encoder.toUint8Array() }
    }
    return null
}

/**
 * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
 * @param {Transaction} transaction
 *
 * @private
 * @function
 */
export const writeStructsFromTransaction = (encoder: UpdateEncoderV1 | UpdateEncoderV2, transaction: Transaction) => writeClientsStructs(encoder, transaction.doc.store, transaction.beforeState)

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
export const readUpdateV2 = (decoder: decoding.Decoder, ydoc: Doc, transactionOrigin: any, structDecoder: UpdateDecoderV1 | UpdateDecoderV2 = new UpdateDecoderV2(decoder)) =>
    ydoc.transact(transaction => {
        // force that transaction.local is set to non-local
        transaction.local = false
        let retry = false
        const doc = transaction.doc
        const store = doc.store
        // let start = performance.now()
        const ss = readClientsStructRefs(structDecoder, doc)
        // console.log('time to read structs: ', performance.now() - start) // @todo remove
        // start = performance.now()
        // console.log('time to merge: ', performance.now() - start) // @todo remove
        // start = performance.now()
        const restStructs = integrateStructs(transaction, store, ss)
        const pending = store.pendingStructs
        if (pending) {
            // check if we can apply something
            for (const [client, clock] of pending.missing) {
                if (clock < store.getState(client)) {
                    retry = true
                    break
                }
            }
            if (restStructs) {
                // merge restStructs into store.pending
                for (const [client, clock] of restStructs.missing) {
                    const mclock = pending.missing.get(client)
                    if (mclock == null || mclock > clock) {
                        pending.missing.set(client, clock)
                    }
                }
                pending.update = mergeUpdatesV2([pending.update, restStructs.update])
            }
        } else {
            store.pendingStructs = restStructs
        }
        // console.log('time to integrate: ', performance.now() - start) // @todo remove
        // start = performance.now()
        const dsRest = DeleteSet.decodeAndApply(structDecoder, transaction, store)
        if (store.pendingDs) {
            // @todo we could make a lower-bound state-vector check as we do above
            const pendingDSUpdate = new UpdateDecoderV2(decoding.createDecoder(store.pendingDs))
            decoding.readVarUint(pendingDSUpdate.restDecoder) // read 0 structs, because we only encode deletes in pendingdsupdate
            const dsRest2 = DeleteSet.decodeAndApply(pendingDSUpdate, transaction, store)
            if (dsRest && dsRest2) {
                // case 1: ds1 != null && ds2 != null
                store.pendingDs = mergeUpdatesV2([dsRest, dsRest2])
            } else {
                // case 2: ds1 != null
                // case 3: ds2 != null
                // case 4: ds1 == null && ds2 == null
                store.pendingDs = dsRest || dsRest2
            }
        } else {
            // Either dsRest == null && pendingDs == null OR dsRest != null
            store.pendingDs = dsRest
        }
        // console.log('time to cleanup: ', performance.now() - start) // @todo remove
        // start = performance.now()

        // console.log('time to resume delete readers: ', performance.now() - start) // @todo remove
        // start = performance.now()
        if (retry) {
            const update = (store.pendingStructs as {update: Uint8Array}).update
            store.pendingStructs = null
            applyUpdateV2(transaction.doc, update)
        }
    }, transactionOrigin, false)

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
export const readUpdate = (decoder: decoding.Decoder, ydoc: Doc, transactionOrigin: any) => readUpdateV2(decoder, ydoc, transactionOrigin, new UpdateDecoderV1(decoder))

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
export const applyUpdateV2 = (ydoc: Doc, update: Uint8Array, transactionOrigin?: any, YDecoder: typeof UpdateDecoderV1 | typeof UpdateDecoderV2 = UpdateDecoderV2) => {
    const decoder = decoding.createDecoder(update)
    readUpdateV2(decoder, ydoc, transactionOrigin, new YDecoder(decoder))
}

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
export const applyUpdate = (ydoc: Doc, update: Uint8Array, transactionOrigin?: any) => applyUpdateV2(ydoc, update, transactionOrigin, UpdateDecoderV1)

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
export const writeStateAsUpdate = (encoder: UpdateEncoderV1 | UpdateEncoderV2, doc: Doc, targetStateVector: Map<number, number> = new Map()) => {
    writeClientsStructs(encoder, doc.store, targetStateVector)
    DeleteSet.createFromStructStore(doc.store).encode(encoder)
}

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
export const encodeStateAsUpdateV2 = (doc: Doc, encodedTargetStateVector: Uint8Array = new Uint8Array([0]), encoder: UpdateEncoderV1 | UpdateEncoderV2 = new UpdateEncoderV2()): Uint8Array => {
    const targetStateVector = decodeStateVector(encodedTargetStateVector)
    writeStateAsUpdate(encoder, doc, targetStateVector)
    const updates = [encoder.toUint8Array()]
    // also add the pending updates (if there are any)
    if (doc.store.pendingDs) {
        updates.push(doc.store.pendingDs)
    }
    if (doc.store.pendingStructs) {
        updates.push(diffUpdateV2(doc.store.pendingStructs.update, encodedTargetStateVector))
    }
    if (updates.length > 1) {
        if (encoder.constructor === UpdateEncoderV1) {
            return mergeUpdates(updates.map((update, i) => i === 0 ? update : convertUpdateFormatV2ToV1(update)))
        } else if (encoder.constructor === UpdateEncoderV2) {
            return mergeUpdatesV2(updates)
        }
    }
    return updates[0]
}

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
export const encodeStateAsUpdate = (doc: Doc, encodedTargetStateVector?: Uint8Array): Uint8Array => {
    return encodeStateAsUpdateV2(doc, encodedTargetStateVector, new UpdateEncoderV1())
}

/**
 * Read state vector from Decoder and return as Map
 *
 * @param {DSDecoderV1 | DSDecoderV2} decoder
 * @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
 *
 * @function
 */
export const readStateVector = (decoder: DSDecoderV1 | DSDecoderV2): Map<number, number> => {
    const ss = new Map()
    const ssLength = decoding.readVarUint(decoder.restDecoder)
    for (let i = 0; i < ssLength; i++) {
        const client = decoding.readVarUint(decoder.restDecoder)
        const clock = decoding.readVarUint(decoder.restDecoder)
        ss.set(client, clock)
    }
    return ss
}

/**
 * Read decodedState and return State as Map.
 *
 * @param {Uint8Array} decodedState
 * @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
 *
 * @function
 */
// export const decodeStateVectorV2 = decodedState => readStateVector(new DSDecoderV2(decoding.createDecoder(decodedState)))

/**
 * Read decodedState and return State as Map.
 *
 * @param {Uint8Array} decodedState
 * @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
 *
 * @function
 */
export const decodeStateVector = (decodedState: Uint8Array): Map<number, number> => readStateVector(new DSDecoderV1(decoding.createDecoder(decodedState)))

/**
 * @param {DSEncoderV1 | DSEncoderV2} encoder
 * @param {Map<number,number>} sv
 * @function
 */
export const writeStateVector = (encoder: DSEncoderV1 | DSEncoderV2, sv: Map<number, number>) => {
    encoding.writeVarUint(encoder.restEncoder, sv.size)
    array.from(sv.entries()).sort((a, b) => b[0] - a[0]).forEach(([client, clock]) => {
        encoding.writeVarUint(encoder.restEncoder, client) // @todo use a special client decoder that is based on mapping
        encoding.writeVarUint(encoder.restEncoder, clock)
    })
    return encoder
}

/**
 * @param {DSEncoderV1 | DSEncoderV2} encoder
 * @param {Doc} doc
 *
 * @function
 */
export const writeDocumentStateVector = (encoder: DSEncoderV1 | DSEncoderV2, doc: Doc) => writeStateVector(encoder, doc.store.getStateVector())

/**
 * Encode State as Uint8Array.
 *
 * @param {Doc|Map<number,number>} doc
 * @param {DSEncoderV1 | DSEncoderV2} [encoder]
 * @return {Uint8Array}
 *
 * @function
 */
export const encodeStateVectorV2 = (doc: Doc | Map<number, number>, encoder: DSEncoderV1 | DSEncoderV2 = new DSEncoderV2()): Uint8Array => {
    if (doc instanceof Map) {
        writeStateVector(encoder, doc)
    } else {
        writeDocumentStateVector(encoder, doc)
    }
    return encoder.toUint8Array()
}

/**
 * Encode State as Uint8Array.
 *
 * @param {Doc|Map<number,number>} doc
 * @return {Uint8Array}
 *
 * @function
 */
export const encodeStateVector = (doc: Doc | Map<number, number>): Uint8Array => encodeStateVectorV2(doc, new DSEncoderV1())
