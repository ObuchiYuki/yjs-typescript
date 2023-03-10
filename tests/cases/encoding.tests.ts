import * as t from 'lib0/testing'
import * as promise from 'lib0/promise'

import {
    contentDecoders_,
    readContentBinary,
    readContentDeleted,
    readContentString,
    readContentJSON,
    readContentEmbed,
    readContentType,
    readContentFormat,
    readContentAny,
    readContentDoc,
    Doc,
    PermanentUserData,
    encodeStateAsUpdate,
    applyUpdate
} from '../../src/internals'

import * as Y from '../../src/index'

/**
 * @param {t.TestCase} tc
 */
export const testStructReferences = (tc: t.TestCase) => {
    t.assert(contentDecoders_.length === 11)
    t.assert(contentDecoders_[1] === readContentDeleted)
    t.assert(contentDecoders_[2] === readContentJSON) // TODO: deprecate content json?
    t.assert(contentDecoders_[3] === readContentBinary)
    t.assert(contentDecoders_[4] === readContentString)
    t.assert(contentDecoders_[5] === readContentEmbed)
    t.assert(contentDecoders_[6] === readContentFormat)
    t.assert(contentDecoders_[7] === readContentType)
    t.assert(contentDecoders_[8] === readContentAny)
    t.assert(contentDecoders_[9] === readContentDoc)
    // contentRefs[10] is reserved for Skip structs
}

/**
 * There is some custom encoding/decoding happening in PermanentUserData.
 * This is why it landed here.
 *
 * @param {t.TestCase} tc
 */
export const testPermanentUserData = async (tc: t.TestCase) => {
    const ydoc1 = new Doc()
    const ydoc2 = new Doc()
    const pd1 = new PermanentUserData(ydoc1)
    const pd2 = new PermanentUserData(ydoc2)
    pd1.setUserMapping(ydoc1, ydoc1.clientID, 'user a')
    pd2.setUserMapping(ydoc2, ydoc2.clientID, 'user b')
    ydoc1.getText().insert(0, 'xhi')
    ydoc1.getText().delete(0, 1)
    ydoc2.getText().insert(0, 'hxxi')
    ydoc2.getText().delete(1, 2)
    await promise.wait(10)
    applyUpdate(ydoc2, encodeStateAsUpdate(ydoc1))
    applyUpdate(ydoc1, encodeStateAsUpdate(ydoc2))
    
    // now sync a third doc with same name as doc1 and then create PermanentUserData
    const ydoc3 = new Doc()
    applyUpdate(ydoc3, encodeStateAsUpdate(ydoc1))
    const pd3 = new PermanentUserData(ydoc3)
    pd3.setUserMapping(ydoc3, ydoc3.clientID, 'user a')
}

/**
 * Reported here: https://github.com/yjs/yjs/issues/308
 * @param {t.TestCase} tc
 */
export const testDiffStateVectorOfUpdateIsEmpty = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    /**
     * @type {any}
     */
    let sv: any = null
    ydoc.getText().insert(0, 'a')
    ydoc.on('update', (update: Uint8Array) => {
        sv = Y.encodeStateVectorFromUpdate(update)
    })
    // should produce an update with an empty state vector (because previous ops are missing)
    ydoc.getText().insert(0, 'a')
    t.assert(sv !== null && sv.byteLength === 1 && sv[0] === 0)
}

/**
 * Reported here: https://github.com/yjs/yjs/issues/308
 * @param {t.TestCase} tc
 */
export const testDiffStateVectorOfUpdateIgnoresSkips = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    /**
     * @type {Array<Uint8Array>}
     */
    const updates: Array<Uint8Array> = []
    ydoc.on('update', (update: Uint8Array) => {
        updates.push(update)
    })
    ydoc.getText().insert(0, 'a')
    ydoc.getText().insert(0, 'b')
    ydoc.getText().insert(0, 'c')
    const update13 = Y.mergeUpdates([updates[0], updates[2]])
    const sv = Y.encodeStateVectorFromUpdate(update13)
    const state = Y.decodeStateVector(sv)
    t.assert(state.get(ydoc.clientID) === 1)
    t.assert(state.size === 1)
}
