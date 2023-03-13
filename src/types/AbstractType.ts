
import {
    callEventHandlerListeners,
    getState,
    isVisible,
    ContentType,
    createID,
    ContentAny,
    ContentBinary,
    getItemCleanStart,
    ContentDoc, YText, YArray, Doc, Snapshot, Transaction, Item, // eslint-disable-line
    AbstractType_
} from '../internals'

import * as map from 'lib0/map'
import * as iterator from 'lib0/iterator'
import * as error from 'lib0/error'
import * as math from 'lib0/math'

export * from "./ArraySearchMarker" // temporally
import { ArraySearchMarker } from "./ArraySearchMarker" // temporally here

/**
 * Accumulate all (list) children of a type and return them as an Array.
 */
export const getTypeChildren = (t: AbstractType_<any>): Item[] => {
    let s = t._start
    const arr = []
    while (s) {
        arr.push(s)
        s = s.right
    }
    return arr
}

/**
 * Call event listeners with an event. This will also add an event to all
 * parents (for `.observeDeep` handlers).
 */
export const callTypeObservers = <EventType>(type: AbstractType_<EventType>, transaction: Transaction, event: EventType) => {
    const changedType = type
    const changedParentTypes = transaction.changedParentTypes
    while (true) {
        // @ts-ignore
        map.setIfUndefined(changedParentTypes, type, () => []).push(event)
        if (type._item === null) {
            break
        }
        type = (type._item.parent as AbstractType_<any>)
    }
    callEventHandlerListeners(changedType._eH, event, transaction)
}

export const typeListSlice = (type: AbstractType_<any>, start: number, end: number): any[] => {
    if (start < 0) {
        start = type._length + start
    }
    if (end < 0) {
        end = type._length + end
    }
    let len = end - start
    const cs = []
    let n = type._start
    while (n !== null && len > 0) {
        if (n.countable && !n.deleted) {
            const c = n.content.getContent()
            if (c.length <= start) {
                start -= c.length
            } else {
                for (let i = start; i < c.length && len > 0; i++) {
                    cs.push(c[i])
                    len--
                }
                start = 0
            }
        }
        n = n.right
    }
    return cs
}

export const typeListToArray = (type: AbstractType_<any>): any[] => {
    const cs = []
    let n = type._start
    while (n !== null) {
        if (n.countable && !n.deleted) {
            const c = n.content.getContent()
            for (let i = 0; i < c.length; i++) {
                cs.push(c[i])
            }
        }
        n = n.right
    }
    return cs
}

export const typeListToArraySnapshot = (type: AbstractType_<any>, snapshot: Snapshot): any[] => {
    const cs = []
    let n = type._start
    while (n !== null) {
        if (n.countable && isVisible(n, snapshot)) {
            const c = n.content.getContent()
            for (let i = 0; i < c.length; i++) {
                cs.push(c[i])
            }
        }
        n = n.right
    }
    return cs
}

/**
 * Executes a provided function on once on overy element of this YArray.
 *
 * @param {AbstractType_<any>} type
 * @param {function(any,number,any):void} f A function to execute on every element of this YArray.
 */
export const typeListForEach = (type: AbstractType_<any>, f: (element: any, index: number, parent: any) => void) => {
    let index = 0
    let n = type._start
    while (n !== null) {
        if (n.countable && !n.deleted) {
            const c = n.content.getContent()
            for (let i = 0; i < c.length; i++) {
                f(c[i], index++, type)
            }
        }
        n = n.right
    }
}

export const typeListMap = <C, R>(type: AbstractType_<any>, f: (element: C, index: number, type: AbstractType_<any>) => R): R[] => {
    const result: any[] = []
    typeListForEach(type, (c, i) => {
        result.push(f(c, i, type))
    })
    return result
}

export const typeListCreateIterator = (type: AbstractType_<any>): IterableIterator<any> => {
    let n = type._start
    let currentContent: any[] | null = null
    let currentContentIndex = 0
    return {
        [Symbol.iterator] () {
            return this
        },
        next: () => {
            // find some content
            if (currentContent === null) {
                while (n !== null && n.deleted) {
                    n = n.right
                }
                // check if we reached the end, no need to check currentContent, because it does not exist
                if (n === null) {
                    return {
                        done: true,
                        value: undefined
                    }
                }
                // we found n, so we can set currentContent
                currentContent = n.content.getContent()
                currentContentIndex = 0
                n = n.right // we used the content of n, now iterate to next
            }
            const value = currentContent[currentContentIndex++]
            // check if we need to empty currentContent
            if (currentContent.length <= currentContentIndex) {
                currentContent = null
            }
            return {
                done: false,
                value
            }
        }
    }
}

/**
 * Executes a provided function on once on overy element of this YArray.
 * Operates on a snapshotted state of the document.
 *
 * @param {AbstractType_<any>} type
 * @param {function(any,number,AbstractType_<any>):void} f A function to execute on every element of this YArray.
 * @param {Snapshot} snapshot
 *
 * @private
 * @function
 */
export const typeListForEachSnapshot = (type: AbstractType_<any>, f: (element: any, index: number, type: AbstractType_<any>) => void, snapshot: Snapshot) => {
    let index = 0
    let n = type._start
    while (n !== null) {
        if (n.countable && isVisible(n, snapshot)) {
            const c = n.content.getContent()
            for (let i = 0; i < c.length; i++) {
                f(c[i], index++, type)
            }
        }
        n = n.right
    }
}

export const typeListGet = (type: AbstractType_<any>, index: number): any => {
    const marker = ArraySearchMarker.find(type, index)
    let item = type._start
    if (marker != null) {
        item = marker.item
        index -= marker.index
    }
    for (; item !== null; item = item.right) {
        if (!item.deleted && item.countable) {
            if (index < item.length) {
                return item.content.getContent()[index]
            }
            index -= item.length
        }
    }
}

export const typeListInsertGenericsAfter = (transaction: Transaction, parent: AbstractType_<any>, referenceItem: Item | null, content: (object | Array<any> | boolean | number | null | string | Uint8Array)[]) => {
    let left = referenceItem
    const doc = transaction.doc
    const ownClientId = doc.clientID
    const store = doc.store
    const right = referenceItem === null ? parent._start : referenceItem.right
    
    let jsonContent: Array<object | Array<any> | number | null> = []
    const packJsonContent = () => {
        if (jsonContent.length > 0) {
            left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new ContentAny(jsonContent))
            left.integrate(transaction, 0)
            jsonContent = []
        }
    }
    content.forEach(c => {
        if (c === null) {
            jsonContent.push(c)
        } else {
            switch (c.constructor) {
                case Number:
                case Object:
                case Boolean:
                case Array:
                case String:
                    jsonContent.push(c as String)
                    break
                default:
                    packJsonContent()
                    switch (c.constructor) {
                        case Uint8Array:
                        case ArrayBuffer:
                            left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new ContentBinary(new Uint8Array(c as Uint8Array)))
                            left.integrate(transaction, 0)
                            break
                        case Doc:
                            left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new ContentDoc(c as Doc))
                            left.integrate(transaction, 0)
                            break
                        default:
                            if (c instanceof AbstractType_) {
                                left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new ContentType(c))
                                left.integrate(transaction, 0)
                            } else {
                                throw new Error('Unexpected content type in insert operation')
                            }
                    }
            }
        }
    })
    packJsonContent()
}

const lengthExceeded = error.create('Length exceeded!')

export const typeListInsertGenerics = (transaction: Transaction, parent: AbstractType_<any>, index: number, content: Array<{ [s: string]: any } | Array<any> | number | null | string | Uint8Array>) => {
    if (index > parent._length) {
        throw lengthExceeded
    }
    if (index === 0) {
        if (parent._searchMarker) {
            ArraySearchMarker.updateChanges(parent._searchMarker, index, content.length)
        }
        return typeListInsertGenericsAfter(transaction, parent, null, content)
    }
    const startIndex = index
    const marker = ArraySearchMarker.find(parent, index)
    let n = parent._start
    if (marker != null) {
        n = marker.item
        index -= marker.index
        // we need to iterate one to the left so that the algorithm works
        if (index === 0) {
            // @todo refactor this as it actually doesn't consider formats
            n = n!.prev // important! get the left undeleted item so that we can actually decrease index
            index += (n && n.countable && !n.deleted) ? n.length : 0
        }
    }
    for (; n !== null; n = n.right) {
        if (!n.deleted && n.countable) {
            if (index <= n.length) {
                if (index < n.length) {
                    // insert in-between
                    getItemCleanStart(transaction, createID(n.id.client, n.id.clock + index))
                }
                break
            }
            index -= n.length
        }
    }
    if (parent._searchMarker) {
        ArraySearchMarker.updateChanges(parent._searchMarker, startIndex, content.length)
    }
    return typeListInsertGenericsAfter(transaction, parent, n, content)
}

/**
 * Pushing content is special as we generally want to push after the last item. So we don't have to update
 * the serach marker.
*/
export const typeListPushGenerics = (transaction: Transaction, parent: AbstractType_<any>, content: Array<{ [s: string]: any } | Array<any> | number | null | string | Uint8Array>) => {
    // Use the marker with the highest index and iterate to the right.
    const marker = (parent._searchMarker || [])
        .reduce((maxMarker, currMarker) => {
            return currMarker.index > maxMarker.index ? currMarker : maxMarker
        }, new ArraySearchMarker(parent._start!, 0))

    let item = marker.item
    while (item?.right) { item = item.right }
    return typeListInsertGenericsAfter(transaction, parent, item, content)
}

export const typeListDelete = (transaction: Transaction, parent: AbstractType_<any>, index: number, length: number) => {
    if (length === 0) { return }
    const startIndex = index
    const startLength = length
    const marker = ArraySearchMarker.find(parent, index)
    let item = parent._start
    if (marker != null) {
        item = marker.item
        index -= marker.index
    }
    // compute the first item to be deleted
    for (; item !== null && index > 0; item = item.right) {
        if (!item.deleted && item.countable) {
            if (index < item.length) {
                getItemCleanStart(transaction, createID(item.id.client, item.id.clock + index))
            }
            index -= item.length
        }
    }
    // delete all items until done
    while (length > 0 && item !== null) {
        if (!item.deleted) {
            if (length < item.length) {
                getItemCleanStart(transaction, createID(item.id.client, item.id.clock + length))
            }
            item.delete(transaction)
            length -= item.length
        }
        item = item.right
    }
    if (length > 0) {
        throw lengthExceeded
    }
    if (parent._searchMarker) {
        ArraySearchMarker.updateChanges(parent._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */)
    }
}

export const typeMapDelete = (transaction: Transaction, parent: AbstractType_<any>, key: string) => {
    const c = parent._map.get(key)
    if (c !== undefined) {
        c.delete(transaction)
    }
}

export const typeMapSet = (transaction: Transaction, parent: AbstractType_<any>, key: string, value: object | number | null | Array<any> | string | Uint8Array | AbstractType_<any>) => {
    const left = parent._map.get(key) || null
    const doc = transaction.doc
    const ownClientId = doc.clientID
    let content
    if (value == null) {
        content = new ContentAny([value])
    } else {
        switch (value.constructor) {
            case Number:
            case Object:
            case Boolean:
            case Array:
            case String:
                content = new ContentAny([value])
                break
            case Uint8Array:
                content = new ContentBinary(value as Uint8Array)
                break
            case Doc:
                content = new ContentDoc(value as Doc)
                break
            default:
                if (value instanceof AbstractType_) {
                    content = new ContentType(value)
                } else {
                    throw new Error('Unexpected content type')
                }
        }
    }
    new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastID, null, null, parent, key, content).integrate(transaction, 0)
}

export const typeMapGet = (parent: AbstractType_<any>, key: string): { [s: string]: any } | number | null | Array<any> | string | Uint8Array | AbstractType_<any> | undefined => {
    const val = parent._map.get(key)
    return val !== undefined && !val.deleted ? val.content.getContent()[val.length - 1] : undefined
}

export const typeMapGetAll = (parent: AbstractType_<any>): { [s: string]: { [s: string]: any } | number | null | Array<any> | string | Uint8Array | AbstractType_<any> | undefined } => {
    const res: { [s: string]: any } = {}
    parent._map.forEach((value, key) => {
        if (!value.deleted) {
            res[key] = value.content.getContent()[value.length - 1]
        }
    })
    return res
}

export const typeMapHas = (parent: AbstractType_<any>, key: string): boolean => {
    const val = parent._map.get(key)
    return val !== undefined && !val.deleted
}

export const typeMapGetSnapshot = (parent: AbstractType_<any>, key: string, snapshot: Snapshot): { [s: string]: any } | number | null | Array<any> | string | Uint8Array | AbstractType_<any> | undefined => {
    let v = parent._map.get(key) || null
    while (v !== null && (!snapshot.sv.has(v.id.client) || v.id.clock >= (snapshot.sv.get(v.id.client) || 0))) {
        v = v.left
    }
    return v !== null && isVisible(v, snapshot) ? v.content.getContent()[v.length - 1] : undefined
}

export const createMapIterator = (map: Map<string, Item>): IterableIterator<any[]> => {
    return iterator.iteratorFilter(map.entries(), (entry: any) => !entry[1].deleted)
}
