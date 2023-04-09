import * as t from 'lib0/testing'
import * as Y from "../src/index"
import { RandomGenerator } from './RandomGenerator'
import * as test from "./testHelper_seed"

const gen = new RandomGenerator(0)

export const testUndoMap = (tc: t.TestCase) => {
  const { testConnector, map0, map1 } = test.init(tc, gen, { users: 2 })
  map0.set('a', 0)
  const undoManager = new Y.UndoManager(map0)
  map0.set('a', 1)
  undoManager.undo()
  t.assert(map0.get('a') === 0)
  undoManager.redo()
  t.assert(map0.get('a') === 1)
  // testing sub-types and if it can restore a whole type
  const subType = new Y.Map()
  map0.set('a', subType)
  subType.set('x', 42)
  t.compare(map0.toJSON(), /** @type {any} */ ({ a: { x: 42 } }))
  undoManager.undo()
  t.assert(map0.get('a') === 1)
  undoManager.redo()
  t.compare(map0.toJSON(), /** @type {any} */ ({ a: { x: 42 } }))
  testConnector.syncAll()
  // if content is overwritten by another user, undo operations should be skipped
  map1.set('a', 44)
  testConnector.syncAll()
  undoManager.undo()
  t.assert(map0.get('a') === 44)
  undoManager.redo()
  t.assert(map0.get('a') === 44)

  // test setting value multiple times
  map0.set('b', 'initial')
  undoManager.stopCapturing()
  map0.set('b', 'val1')
  map0.set('b', 'val2')
  undoManager.stopCapturing()
  undoManager.undo()
  t.assert(map0.get('b') === 'initial')
}


testUndoMap(new t.TestCase("_", "_"))