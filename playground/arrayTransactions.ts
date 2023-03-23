import * as Y from '../src/index'
import * as t from 'lib0/testing'
import { glo } from '../src/utils/functions/global_'
import { RandomGenerator } from './RandomGenerator'
import { applyRandomTests } from './testHelper_seed'

let _uniqueNumber = 0
const getUniqueNumber = () => _uniqueNumber++

export const arrayTransactions: Array<((user: Y.Doc, gen: RandomGenerator, _: any) => void)> = [
    function insert (user, gen) {
      const yarray = user.getArray<number>('array')
      const uniqueNumber = getUniqueNumber()
      const content: number[] = []
      const len = gen.int32(1, 4)
      for (let i = 0; i < len; i++) {
        content.push(uniqueNumber)
      }
      const pos = gen.int32(0, yarray.length)
      const oldContent = yarray.toArray()
      yarray.insert(pos, content)
      oldContent.splice(pos, 0, ...content)
      t.compareArrays(yarray.toArray(), oldContent) // we want to make sure that fastSearch markers insert at the correct position
    },
    function insertTypeArray (user, gen) {
      const yarray = user.getArray<Y.Array<number>>('array')
      const pos = gen.int32(0, yarray.length)
      yarray.insert(pos, [new Y.Array()])
      const array2 = yarray.get(pos)
      array2.insert(0, [1, 2, 3, 4])
    },
    function insertTypeMap (user, gen) {
      const yarray = user.getArray<Y.Map<number>>('array')
      const pos = gen.int32(0, yarray.length)
      yarray.insert(pos, [new Y.Map()])
      const map = yarray.get(pos)
      map.set('someprop', 42)
      map.set('someprop', 43)
      map.set('someprop', 44)
    },
    function insertTypeNull (user, gen) {
      const yarray = user.getArray('array')
      const pos = gen.int32(0, yarray.length)
      yarray.insert(pos, [null])
    },
    function _delete (user, gen) {
      const yarray = user.getArray('array')
      const length = yarray.length
      if (length > 0) {
        let somePos = gen.int32(0, length - 1)
        let delLength = gen.int32(1, Math.min(2, length - somePos))
        if (gen.bool()) {
          const type = yarray.get(somePos)
          if (type instanceof Y.Array && type.length > 0) {
            somePos = gen.int32(0, type.length - 1)
            delLength = gen.int32(0, Math.min(2, type.length - somePos))
            type.delete(somePos, delLength)
          }
        } else {
          const oldContent = yarray.toArray()
          yarray.delete(somePos, delLength)
          oldContent.splice(somePos, delLength)
          t.compareArrays(yarray.toArray(), oldContent)
        }
      }
    }
  ]