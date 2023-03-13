
import {
    removeEventHandlerListener,
    callEventHandlerListeners,
    addEventHandlerListener,
    createEventHandler,
    getState,
    isVisible,
    ContentType,
    createID,
    ContentAny,
    ContentBinary,
    getItemCleanStart,
    ContentDoc, YText, YArray, UpdateEncoderV1, UpdateEncoderV2, Doc, Snapshot, Transaction, EventHandler, YEvent, Item, // eslint-disable-line
    AbstractType_
} from '../internals'

import * as map from 'lib0/map'
import * as iterator from 'lib0/iterator'
import * as error from 'lib0/error'
import * as math from 'lib0/math'

const maxSearchMarker = 80

/**
 * A unique timestamp that identifies each marker.
 *
 * Time is relative,.. this is more like an ever-increasing clock.
 */
let globalSearchMarkerTimestamp = 0

export class ArraySearchMarker {
    public timestamp: number

    constructor(
        public p: Item, 
        public index: number
    ) {
        p.marker = true
        this.timestamp = globalSearchMarkerTimestamp++
    }
}

const refreshMarkerTimestamp = (marker: ArraySearchMarker) => { 
    marker.timestamp = globalSearchMarkerTimestamp++ 
}

/**
 * This is rather complex so this function is the only thing that should overwrite a marker
 */
const overwriteMarker = (marker: ArraySearchMarker, p: Item, index: number) => {
    marker.p.marker = false
    marker.p = p
    p.marker = true
    marker.index = index
    marker.timestamp = globalSearchMarkerTimestamp++
}

const markPosition = (searchMarker: ArraySearchMarker[], p: Item, index: number) => {
    if (searchMarker.length >= maxSearchMarker) {
        // override oldest marker (we don't want to create more objects)
        const marker = searchMarker.reduce((a, b) => a.timestamp < b.timestamp ? a : b)
        overwriteMarker(marker, p, index)
        return marker
    } else {
        // create new marker
        const pm = new ArraySearchMarker(p, index)
        searchMarker.push(pm)
        return pm
    }
}

/**
 * Search marker help us to find positions in the associative array faster.
 *
 * They speed up the process of finding a position without much bookkeeping.
 *
 * A maximum of `maxSearchMarker` objects are created.
 *
 * This function always returns a refreshed marker (updated timestamp)
 */
export const findMarker = (yarray: AbstractType_<any>, index: number) => {
    if (yarray._start === null || index === 0 || yarray._searchMarker === null) {
        return null
    }
    const marker = yarray._searchMarker.length === 0 ? null : yarray._searchMarker.reduce((a, b) => math.abs(index - a.index) < math.abs(index - b.index) ? a : b)
    let p = yarray._start
    let pindex = 0
    if (marker !== null) {
        p = marker.p
        pindex = marker.index
        refreshMarkerTimestamp(marker) // we used it, we might need to use it again
    }
    // iterate to right if possible
    while (p.right !== null && pindex < index) {
        if (!p.deleted && p.countable) {
            if (index < pindex + p.length) {
                break
            }
            pindex += p.length
        }
        p = p.right
    }
    // iterate to left if necessary (might be that pindex > index)
    while (p.left !== null && pindex > index) {
        p = p.left
        if (!p.deleted && p.countable) {
            pindex -= p.length
        }
    }
    // we want to make sure that p can't be merged with left, because that would screw up everything
    // in that cas just return what we have (it is most likely the best marker anyway)
    // iterate to left until p can't be merged with left
    while (p.left !== null && p.left.id.client === p.id.client && p.left.id.clock + p.left.length === p.id.clock) {
        p = p.left
        if (!p.deleted && p.countable) {
            pindex -= p.length
        }
    }

    if (marker !== null && math.abs(marker.index - pindex) < (p.parent as YText|YArray<any>).length / maxSearchMarker) {
        // adjust existing marker
        overwriteMarker(marker, p, pindex)
        return marker
    } else {
        // create new marker
        return markPosition(yarray._searchMarker, p, pindex)
    }
}

/**
 * Update markers when a change happened.
 *
 * This should be called before doing a deletion!
 */
export const updateMarkerChanges = (searchMarker: ArraySearchMarker[], index: number, len: number) => {
    for (let i = searchMarker.length - 1; i >= 0; i--) {
        const m = searchMarker[i]
        if (len > 0) {
            let p: Item|null = m.p
            p.marker = false
            // Ideally we just want to do a simple position comparison, but this will only work if
            // search markers don't point to deleted items for formats.
            // Iterate marker to prev undeleted countable position so we know what to do when updating a position
            while (p && (p.deleted || !p.countable)) {
                p = p.left
                if (p && !p.deleted && p.countable) {
                    // adjust position. the loop should break now
                    m.index -= p.length
                }
            }
            if (p === null || p.marker === true) {
                // remove search marker if updated position is null or if position is already marked
                searchMarker.splice(i, 1)
                continue
            }
            m.p = p
            p.marker = true
        }
        if (index < m.index || (len > 0 && index === m.index)) { // a simple index <= m.index check would actually suffice
            m.index = math.max(index, m.index + len)
        }
    }
}

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

/**
 * Abstract Yjs Type class
 */
// export class AbstractType_<EventType> {
//     doc: Doc|null = null

//     _item: Item|null = null
//     _map: Map<string, Item> = new Map()
//     _start: Item|null = null
//     _length: number = 0
//     /** Event handlers */
//     _eH: EventHandler<EventType,Transaction> = createEventHandler()
//     /** Deep event handlers */
//     _dEH: EventHandler<Array<YEvent<any>>,Transaction> = createEventHandler()
//     _searchMarker: null | Array<ArraySearchMarker> = null

//     constructor () {}

//     get parent(): AbstractType_<any>|null {
//         return this._item ? (this._item.parent as AbstractType_<any>) : null
//     }

//     /**
//      * Integrate this type into the Yjs instance.
//      *
//      * * Save this struct in the os
//      * * This type is sent to other client
//      * * Observer functions are fired
//      */
//     _integrate(y: Doc, item: Item|null) {
//         this.doc = y
//         this._item = item
//     }

//     _copy(): AbstractType_<EventType> { throw error.methodUnimplemented() }

//     clone(): AbstractType_<EventType> { throw error.methodUnimplemented() }

//     _write (_encoder: UpdateEncoderV1 | UpdateEncoderV2) { }

//     /** The first non-deleted item */
//     get _first() {
//         let n = this._start
//         while (n !== null && n.deleted) { n = n.right }
//         return n
//     }

//     /**
//      * Creates YEvent and calls all type observers.
//      * Must be implemented by each type.
//      *
//      * @param {Transaction} transaction
//      * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
//      */
//     _callObserver(transaction: Transaction, _parentSubs: Set<null|string>) {
//         if (!transaction.local && this._searchMarker) {
//             this._searchMarker.length = 0
//         }
//     }

//     /** Observe all events that are created on this type. */
//     observe(f: (type: EventType, transaction: Transaction) => void) {
//         addEventHandlerListener(this._eH, f)
//     }

//     /** Observe all events that are created by this type and its children. */
//     observeDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void) {
//         addEventHandlerListener(this._dEH, f)
//     }

//     /** Unregister an observer function. */
//     unobserve(f: (type: EventType, transaction: Transaction) => void) {
//         removeEventHandlerListener(this._eH, f)
//     }

//     /** Unregister an observer function. */
//     unobserveDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void) {
//         removeEventHandlerListener(this._dEH, f)
//     }

//     toJSON(): any {}
// }

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
    const marker = findMarker(type, index)
    let n = type._start
    if (marker !== null) {
        n = marker.p
        index -= marker.index
    }
    for (; n !== null; n = n.right) {
        if (!n.deleted && n.countable) {
            if (index < n.length) {
                return n.content.getContent()[index]
            }
            index -= n.length
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
            updateMarkerChanges(parent._searchMarker, index, content.length)
        }
        return typeListInsertGenericsAfter(transaction, parent, null, content)
    }
    const startIndex = index
    const marker = findMarker(parent, index)
    let n = parent._start
    if (marker !== null) {
        n = marker.p
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
        updateMarkerChanges(parent._searchMarker, startIndex, content.length)
    }
    return typeListInsertGenericsAfter(transaction, parent, n, content)
}

/**
 * Pushing content is special as we generally want to push after the last item. So we don't have to update
 * the serach marker.
*/
export const typeListPushGenerics = (transaction: Transaction, parent: AbstractType_<any>, content: Array<{ [s: string]: any } | Array<any> | number | null | string | Uint8Array>) => {
    // Use the marker with the highest index and iterate to the right.
    const marker = (parent._searchMarker || []).reduce((maxMarker, currMarker) => currMarker.index > maxMarker.index ? currMarker : maxMarker, { index: 0, p: parent._start })
    let n = marker.p
    if (n) {
        while (n.right) {
            n = n.right
        }
    }
    return typeListInsertGenericsAfter(transaction, parent, n, content)
}

export const typeListDelete = (transaction: Transaction, parent: AbstractType_<any>, index: number, length: number) => {
    if (length === 0) { return }
    const startIndex = index
    const startLength = length
    const marker = findMarker(parent, index)
    let n = parent._start
    if (marker !== null) {
        n = marker.p
        index -= marker.index
    }
    // compute the first item to be deleted
    for (; n !== null && index > 0; n = n.right) {
        if (!n.deleted && n.countable) {
            if (index < n.length) {
                getItemCleanStart(transaction, createID(n.id.client, n.id.clock + index))
            }
            index -= n.length
        }
    }
    // delete all items until done
    while (length > 0 && n !== null) {
        if (!n.deleted) {
            if (length < n.length) {
                getItemCleanStart(transaction, createID(n.id.client, n.id.clock + length))
            }
            n.delete(transaction)
            length -= n.length
        }
        n = n.right
    }
    if (length > 0) {
        throw lengthExceeded
    }
    if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */)
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
