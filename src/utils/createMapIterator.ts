
import { Item } from '../internals'
import * as iterator from 'lib0/iterator'

export const createMapIterator = (map: Map<string, Item>): IterableIterator<any[]> => {
    return iterator.iteratorFilter(map.entries(), (entry: any) => !entry[1].deleted)
}