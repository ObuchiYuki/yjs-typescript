import * as t from 'lib0/testing'
import { init, compare } from '../testHelper' // eslint-disable-line
import * as Y from '../../src/index'
import { readClientsStructRefs, UpdateDecoderV2, UpdateEncoderV2 } from '../../src/internals'

import * as lib0 from "lib0-typescript"

/**
 * @typedef {Object} Enc
 * @property {function(Array<Uint8Array>):Uint8Array} Enc.mergeUpdates
 * @property {function(Y.Doc):Uint8Array} Enc.encodeStateAsUpdate
 * @property {function(Y.Doc, Uint8Array):void} Enc.applyUpdate
 * @property {function(Uint8Array):void} Enc.logUpdate
 * @property {function(Uint8Array):{from:Map<number,number>,to:Map<number,number>}} Enc.parseUpdateMeta
 * @property {function(Y.Doc):Uint8Array} Enc.encodeStateVector
 * @property {function(Uint8Array):Uint8Array} Enc.encodeStateVectorFromUpdate
 * @property {string} Enc.updateEventName
 * @property {string} Enc.description
 * @property {function(Uint8Array, Uint8Array):Uint8Array} Enc.diffUpdate
 */

export type Enc = {
  mergeUpdates: (updates: Array<Uint8Array>) => Uint8Array,
  encodeStateAsUpdate: (doc: Y.Doc, encodedTargetStateVector?: Uint8Array) => Uint8Array,
  applyUpdate: (ydoc: Y.Doc, update: Uint8Array, transactionOrigin?: any) => void,
  logUpdate: (update: Uint8Array) => void,
  parseUpdateMeta: (update: Uint8Array) => { from: Map<number, number>, to: Map<number, number> },
  encodeStateVectorFromUpdate: (update: Uint8Array) => Uint8Array,
  encodeStateVector: (doc: Y.Doc | Map<number, number>) => Uint8Array,
  updateEventName: "update"|"updateV2",
  description: string,
  diffUpdate: (update: Uint8Array, sv: Uint8Array) => Uint8Array
}

/**
 * @type {Enc}
 */
export const encV1: Enc = {
  mergeUpdates: Y.mergeUpdates,
  encodeStateAsUpdate: Y.encodeStateAsUpdate,
  applyUpdate: Y.applyUpdate,
  logUpdate: Y.logUpdate,
  parseUpdateMeta: Y.parseUpdateMeta,
  encodeStateVectorFromUpdate: Y.encodeStateVectorFromUpdate,
  encodeStateVector: Y.encodeStateVector,
  updateEventName: 'update',
  description: 'V1',
  diffUpdate: Y.diffUpdate
}

/**
 * @type {Enc}
 */
export const encV2: Enc = {
  mergeUpdates: Y.mergeUpdatesV2,
  encodeStateAsUpdate: Y.encodeStateAsUpdateV2,
  applyUpdate: Y.applyUpdateV2,
  logUpdate: Y.logUpdateV2,
  parseUpdateMeta: Y.parseUpdateMetaV2,
  encodeStateVectorFromUpdate: Y.encodeStateVectorFromUpdateV2,
  encodeStateVector: Y.encodeStateVector,
  updateEventName: 'updateV2',
  description: 'V2',
  diffUpdate: Y.diffUpdateV2
}

/**
 * @type {Enc}
 */
export const encDoc: Enc = {
  mergeUpdates: (updates) => {
    const ydoc = new Y.Doc({ gc: false })
    updates.forEach(update => {
      Y.applyUpdateV2(ydoc, update)
    })
    return Y.encodeStateAsUpdateV2(ydoc)
  },
  encodeStateAsUpdate: Y.encodeStateAsUpdateV2,
  applyUpdate: Y.applyUpdateV2,
  logUpdate: Y.logUpdateV2,
  parseUpdateMeta: Y.parseUpdateMetaV2,
  encodeStateVectorFromUpdate: Y.encodeStateVectorFromUpdateV2,
  encodeStateVector: Y.encodeStateVector,
  updateEventName: 'updateV2',
  description: 'Merge via Y.Doc',
  /**
   * @param {Uint8Array} update
   * @param {Uint8Array} sv
   */
  diffUpdate: (update: Uint8Array, sv: Uint8Array) => {
    const ydoc = new Y.Doc({ gc: false })
    Y.applyUpdateV2(ydoc, update)
    return Y.encodeStateAsUpdateV2(ydoc, sv)
  }
}

export const encoders = [encV1, encV2, encDoc]

/**
 * @param {Array<Y.Doc>} users
 * @param {Enc} enc
 */ 
export const fromUpdates = (users: Array<Y.Doc>, enc: Enc) => {
  const updates = users.map(user =>
    enc.encodeStateAsUpdate(user)
  )

  const ydoc = new Y.Doc()
  enc.applyUpdate(ydoc, enc.mergeUpdates(updates))
  return ydoc
}

/**
 * @param {t.TestCase} tc
 */
export const testMergeUpdates = (tc: t.TestCase) => {
  const { users, array0, array1 } = init(tc, { users: 3 })

  array0.insert(0, [1])
  array1.insert(0, [2])

  compare(users)
  encoders.forEach(enc => {
    const merged = fromUpdates(users, enc)
    t.compareArrays(array0.toArray(), merged.getArray('array').toArray())
  })
}

/**
 * @param {t.TestCase} tc
 */
export const testKeyEncoding = (tc: t.TestCase) => {
  const { users, text0, text1 } = init(tc, { users: 2 })

  text0.insert(0, 'a', { italic: true })
  text0.insert(0, 'b')
  text0.insert(0, 'c', { italic: true })

  const update = Y.encodeStateAsUpdateV2(users[0])
  Y.applyUpdateV2(users[1], update)

  t.compare(text1.toDelta(), [{ insert: 'c', attributes: { italic: true } }, { insert: 'b' }, { insert: 'a', attributes: { italic: true } }])

  compare(users)
}

/**
 * @param {Y.Doc} ydoc
 * @param {Array<Uint8Array>} updates - expecting at least 4 updates
 * @param {Enc} enc
 * @param {boolean} hasDeletes
 */
export const checkUpdateCases = (ydoc: Y.Doc, updates: Array<Uint8Array>, enc: Enc, hasDeletes: boolean) => {
  const cases: Uint8Array[] = []

  // Case 1: Simple case, simply merge everything
  cases.push(enc.mergeUpdates(updates))

  // Case 2: Overlapping updates
  cases.push(enc.mergeUpdates([
    enc.mergeUpdates(updates.slice(2)),
    enc.mergeUpdates(updates.slice(0, 2))
  ]))

  // Case 3: Overlapping updates
  cases.push(enc.mergeUpdates([
    enc.mergeUpdates(updates.slice(2)),
    enc.mergeUpdates(updates.slice(1, 3)),
    updates[0]
  ]))

  // Case 4: Separated updates (containing skips)
  cases.push(enc.mergeUpdates([
    enc.mergeUpdates([updates[0], updates[2]]),
    enc.mergeUpdates([updates[1], updates[3]]),
    enc.mergeUpdates(updates.slice(4))
  ]))

  // Case 5: overlapping with many duplicates
  // cases.push(enc.mergeUpdates(cases))

  const targetState = enc.encodeStateAsUpdate(ydoc)
  t.info('Target State: ')
  enc.logUpdate(targetState)

  cases.forEach((mergedUpdates, i) => {
    // t.info('State Case $' + i + ':')
    // enc.logUpdate(updates)
    const merged = new Y.Doc({ gc: false })
    enc.applyUpdate(merged, mergedUpdates)
    t.compareArrays(merged.getArray().toArray(), ydoc.getArray().toArray())
    t.compare(enc.encodeStateVector(merged), enc.encodeStateVectorFromUpdate(mergedUpdates))

    if (enc.updateEventName !== 'update') { // @todo should this also work on legacy updates?
      for (let j = 1; j < updates.length; j++) {
        const partMerged = enc.mergeUpdates(updates.slice(j))
        const partMeta = enc.parseUpdateMeta(partMerged)
        const targetSV = Y.encodeStateVectorFromUpdateV2(Y.mergeUpdatesV2(updates.slice(0, j)))
        const diffed = enc.diffUpdate(mergedUpdates, targetSV)
        const diffedMeta = enc.parseUpdateMeta(diffed)
        t.compare(partMeta, diffedMeta)
        {
          // We can'd do the following
          //  - t.compare(diffed, mergedDeletes)
          // because diffed contains the set of all deletes.
          // So we add all deletes from `diffed` to `partDeletes` and compare then
          const decoder = new lib0.Decoder(diffed)
          const updateDecoder = new UpdateDecoderV2(decoder)
          readClientsStructRefs(updateDecoder, new Y.Doc())
          const ds = Y.DeleteSet.decode(updateDecoder)
          const updateEncoder = new UpdateEncoderV2()
          updateEncoder.restEncoder.writeVarUint(0) // 0 structs
          ds.encode(updateEncoder)
          const deletesUpdate = updateEncoder.toUint8Array()
          const mergedDeletes = Y.mergeUpdatesV2([deletesUpdate, partMerged])
          if (!hasDeletes || enc !== encDoc) {
            // deletes will almost definitely lead to different encoders because of the mergeStruct feature that is present in encDoc
            t.compare(diffed, mergedDeletes)
          }
        }
      }
    }

    const meta = enc.parseUpdateMeta(mergedUpdates)
    meta.from.forEach((clock, client) => t.assert(clock === 0))
    meta.to.forEach((clock, client) => {
      const structs = merged.store.clients.get(client) as Y.Item[]
      const lastStruct = structs[structs.length - 1]
      t.assert(lastStruct.id.clock + lastStruct.length === clock)
    })
  })
}

/**
 * @param {t.TestCase} tc
 */
export const testMergeUpdates1 = (tc: t.TestCase) => {
  encoders.forEach((enc, i) => {
    t.info(`Using encoder: ${enc.description}`)
    const ydoc = new Y.Doc({ gc: false })
    const updates: Uint8Array[] = []
    ydoc.on(enc.updateEventName, (update: Uint8Array) => { updates.push(update) })

    const array = ydoc.getArray()
    array.insert(0, [1])
    array.insert(0, [2])
    array.insert(0, [3])
    array.insert(0, [4])

    checkUpdateCases(ydoc, updates, enc, false)
  })
}

/**
 * @param {t.TestCase} tc
 */
export const testMergeUpdates2 = (tc: t.TestCase) => {
  encoders.forEach((enc, i) => {
    t.info(`Using encoder: ${enc.description}`)
    const ydoc = new Y.Doc({ gc: false })
    const updates: Uint8Array[] = []
    ydoc.on(enc.updateEventName, (update: Uint8Array) => { updates.push(update) })

    const array = ydoc.getArray()
    array.insert(0, [1, 2])
    array.delete(1, 1)
    array.insert(0, [3, 4])
    array.delete(1, 2)

    checkUpdateCases(ydoc, updates, enc, true)
  })
}

/**
 * @param {t.TestCase} tc
 */
export const testMergePendingUpdates = (tc: t.TestCase) => {
  const yDoc = new Y.Doc()
  /**
   * @type {Array<>}
   */
  const serverUpdates: Uint8Array[] = []
  yDoc.on('update', (update: Uint8Array, origin: any, c: any) => {
    serverUpdates.splice(serverUpdates.length, 0, update)
  })
  const yText = yDoc.getText('textBlock')
  yText.applyDelta([{ insert: 'r' }])
  yText.applyDelta([{ insert: 'o' }])
  yText.applyDelta([{ insert: 'n' }])
  yText.applyDelta([{ insert: 'e' }])
  yText.applyDelta([{ insert: 'n' }])

  const yDoc1 = new Y.Doc()
  Y.applyUpdate(yDoc1, serverUpdates[0])
  const update1 = Y.encodeStateAsUpdate(yDoc1)

  const yDoc2 = new Y.Doc()
  Y.applyUpdate(yDoc2, update1)
  Y.applyUpdate(yDoc2, serverUpdates[1])
  const update2 = Y.encodeStateAsUpdate(yDoc2)

  const yDoc3 = new Y.Doc()
  Y.applyUpdate(yDoc3, update2)
  Y.applyUpdate(yDoc3, serverUpdates[3])
  const update3 = Y.encodeStateAsUpdate(yDoc3)

  const yDoc4 = new Y.Doc()
  Y.applyUpdate(yDoc4, update3)
  Y.applyUpdate(yDoc4, serverUpdates[2])
  const update4 = Y.encodeStateAsUpdate(yDoc4)

  const yDoc5 = new Y.Doc()
  Y.applyUpdate(yDoc5, update4)
  Y.applyUpdate(yDoc5, serverUpdates[4])
  // @ts-ignore
  const update5 = Y.encodeStateAsUpdate(yDoc5) // eslint-disable-line

  const yText5 = yDoc5.getText('textBlock')
  t.compareStrings(yText5.toString(), 'nenor')
}
