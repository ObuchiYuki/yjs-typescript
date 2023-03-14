import {
    Doc, Transaction, EventHandler, YEvent, Item, 
    UpdateEncoderAny_, ArraySearchMarker_, Snapshot, 
    ContentAny, ContentBinary, ContentDoc, ContentType, Content_, ID, StructStore
} from '../internals'

import * as lib0 from "lib0-typescript"

export type Contentable_ = object | Contentable_[] | boolean | number | null | string | Uint8Array

export abstract class AbstractType_<EventType> {
    // ================================================================================================================ //
    // MARK: - Property -
    doc: Doc|null = null

    get parent(): AbstractType_<any>|null {
        return this._item ? (this._item.parent as AbstractType_<any>) : null
    }

    // ================================================================================================================ //
    // MARK: - Private (Temporally public) -
    _item: Item|null = null
    _map: Map<string, Item> = new Map()
    _start: Item|null = null
    _length: number = 0
    _eH: EventHandler<EventType,Transaction> = new EventHandler() /** Event handlers */
    _dEH: EventHandler<Array<YEvent<any>>,Transaction> = new EventHandler() /** Deep event handlers */
    _searchMarker: null | Array<ArraySearchMarker_> = null

     /** The first non-deleted item */
    get _first() {
        let n = this._start
        while (n !== null && n.deleted) { n = n.right }
        return n
    }

    // ================================================================================================================ //
    // MARK: - Abstract Methods -

    abstract clone(): AbstractType_<EventType>

    abstract _copy(): AbstractType_<EventType>

    // ================================================================================================================ //
    // MARK: - Methods -

    constructor () {}

    /** Accumulate all (list) children of a type and return them as an Array. */
    getChildren(): Item[] {
        let item = this._start
        const arr: Item[] = []
        while (item != null) {
            arr.push(item)
            item = item.right
        }
        return arr
    }

    /**
     * Check if `parent` is a parent of `child`.
     *
     * @param {AbstractType_<any>} parent
     * @param {Item|null} child
     * @return {Boolean} Whether `parent` is a parent of `child`.
     */
    isParentOf(child: Item | null): boolean{
        while (child !== null) {
            if (child.parent === this) { return true }
            child = (child.parent as AbstractType_<any>)._item
        }
        return false
    }

    /** Call event listeners with an event. This will also add an event to all parents (for `.observeDeep` handlers). */
    callObservers<EventType extends YEvent<any>>(this: AbstractType_<any>, transaction: Transaction, event: EventType) {
        let type = this 
        const changedType = type
        const changedParentTypes = transaction.changedParentTypes
        while (true) {
            lib0.setIfUndefined(changedParentTypes, type, () => [] as YEvent<any>[])
                .push(event)
            if (type._item === null) { break }
            type = (type._item.parent as AbstractType_<any>)
        }
        changedType._eH.callListeners(event, transaction)
    }

    listSlice(start: number, end: number): any[] {

        if (start < 0) {
            start = this._length + start
        }
        if (end < 0) {
            end = this._length + end
        }
        let len = end - start
        const cs = []
        let n = this._start
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

    listToArray(): any[]{
        const cs = []
        let n = this._start
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

    listToArraySnapshot(snapshot: Snapshot): any[] {
        const cs = []
        let n = this._start
        while (n !== null) {
            if (n.countable && n.isVisible(snapshot)) {
                const c = n.content.getContent()
                for (let i = 0; i < c.length; i++) {
                    cs.push(c[i])
                }
            }
            n = n.right
        }
        return cs
    }

    /** Executes a provided function on once on overy element of this YArray. */
    listForEach(body: (element: any, index: number, parent: this) => void){
        let index = 0
        let item = this._start
        while (item !== null) {
            if (item.countable && !item.deleted) {
                const c = item.content.getContent()
                for (let i = 0; i < c.length; i++) {
                    body(c[i], index++, this)
                }
            }
            item = item.right
        }
    }

    listMap<C, R>(body: (element: C, index: number, type: this) => R): R[]{
        const result: R[] = []
        this.listForEach((element, index) => {
            result.push(body(element, index, this))
        })
        return result
    }

    listCreateIterator(): IterableIterator<any> {
        let item = this._start
        let currentContent: any[] | null = null
        let currentContentIndex = 0
        return {
            [Symbol.iterator]() { return this },
            next: () => {
                // find some content
                if (currentContent === null) {
                    while (item != null && item.deleted) { item = item.right }
                    if (item == null) { return { done: true, value: undefined } }
                    // we found n, so we can set currentContent
                    currentContent = item.content.getContent()
                    currentContentIndex = 0
                    item = item.right // we used the content of n, now iterate to next
                }
                const value = currentContent[currentContentIndex++]
                // check if we need to empty currentContent
                if (currentContent.length <= currentContentIndex) { currentContent = null }
                return { done: false, value }
            }
        }
    }

    /**
     * Executes a provided function on once on overy element of this YArray.
     * Operates on a snapshotted state of the document.
     */
    listForEachSnapshot(body: (element: any, index: number, type: this) => void, snapshot: Snapshot) {
        let index = 0
        let item = this._start
        while (item !== null) {
            if (item.countable && item.isVisible(snapshot)) {
                const c = item.content.getContent()
                for (let i = 0; i < c.length; i++) {
                    body(c[i], index++, this)
                }
            }
            item = item.right
        }
    }

    listGet(index: number): any {
        const marker = ArraySearchMarker_.find(this, index)
        let item = this._start
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

    // this -> parent
    listInsertGenericsAfter(transaction: Transaction, referenceItem: Item | null, contents: Contentable_[]) {
        let left = referenceItem
        const doc = transaction.doc
        const ownClientId = doc.clientID
        const store = doc.store
        const right = referenceItem === null ? this._start : referenceItem.right

        type JsonContent = { [s: string]: JsonContent } | JsonContent[] | number | null | string

        let jsonContent: JsonContent[] = []

        const packJsonContent = () => {
            if (jsonContent.length <= 0) return
            const id = new ID(ownClientId, store.getState(ownClientId))
            const content = new ContentAny(jsonContent)
            left = new Item(id, left, left && left.lastID, right, right && right.id, this, null, content)
            left.integrate(transaction, 0)
            jsonContent = []
        }

        contents.forEach(content => {
            if (content === null) {
                jsonContent.push(content)
            } else {
                if (
                    content.constructor === Number ||
                    content.constructor === Object ||
                    content.constructor === Boolean ||
                    content.constructor === Array ||
                    content.constructor === String
                ) {
                    jsonContent.push(content as string)
                } else {
                    packJsonContent()
                    if (
                        content.constructor === Uint8Array || 
                        content.constructor === ArrayBuffer
                    ) {
                        const id = new ID(ownClientId, store.getState(ownClientId))
                        const icontent = new ContentBinary(new Uint8Array(content as Uint8Array))
                        left = new Item(id, left, left && left.lastID, right, right && right.id, this, null, icontent)
                        left.integrate(transaction, 0)
                    } else if (content.constructor === Doc) {
                        const id = new ID(ownClientId, store.getState(ownClientId))
                        const icontent = new ContentDoc(content as Doc)
                        left = new Item(id, left, left && left.lastID, right, right && right.id, this, null, icontent)
                        left.integrate(transaction, 0)
                    } else if (content instanceof AbstractType_) {
                        const id = new ID(ownClientId, store.getState(ownClientId))
                        const icontent = new ContentType(content)
                        left = new Item(id, left, left && left.lastID, right, right && right.id, this, null, icontent)
                        left.integrate(transaction, 0)
                    } else {
                        throw new Error('Unexpected content type in insert operation')
                    }
                }
            }
        })
        packJsonContent()
    }

    // this -> parent
    listInsertGenerics = (transaction: Transaction, index: number, contents: Contentable_[]) => {
        if (index > this._length) { throw new Error('Length exceeded!') }

        if (index === 0) {
            if (this._searchMarker) {
                ArraySearchMarker_.updateChanges(this._searchMarker, index, contents.length)
            }
            return this.listInsertGenericsAfter(transaction, null, contents)
        }
        const startIndex = index
        const marker = ArraySearchMarker_.find(this, index)
        let n = this._start
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
                        StructStore.getItemCleanStart(transaction, new ID(n.id.client, n.id.clock + index))
                    }
                    break
                }
                index -= n.length
            }
        }
        if (this._searchMarker) {
            ArraySearchMarker_.updateChanges(this._searchMarker, startIndex, contents.length)
        }
        return this.listInsertGenericsAfter(transaction, n, contents)
    }
    

    /**
     * this -> parent
     * 
     * Pushing content is special as we generally want to push after the last item. So we don't have to update
     * the serach marker.
    */
    listPushGenerics(transaction: Transaction, contents: Contentable_[]) {
        // Use the marker with the highest index and iterate to the right.
        const marker = (this._searchMarker || [])
            .reduce((maxMarker, currMarker) => {
                return currMarker.index > maxMarker.index ? currMarker : maxMarker
            }, new ArraySearchMarker_(this._start, 0))

        let item = marker.item
        while (item?.right) { item = item.right }
        return this.listInsertGenericsAfter(transaction, item, contents)
    }


    /** this -> parent */
    listDelete(transaction: Transaction, index: number, length: number) {
        if (length === 0) { return }
        const startIndex = index
        const startLength = length
        const marker = ArraySearchMarker_.find(this, index)
        let item = this._start
        if (marker != null) {
            item = marker.item
            index -= marker.index
        }
        // compute the first item to be deleted
        for (; item !== null && index > 0; item = item.right) {
            if (!item.deleted && item.countable) {
                if (index < item.length) {
                    StructStore.getItemCleanStart(transaction, new ID(item.id.client, item.id.clock + index))
                }
                index -= item.length
            }
        }
        // delete all items until done
        while (length > 0 && item !== null) {
            if (!item.deleted) {
                if (length < item.length) {
                    StructStore.getItemCleanStart(transaction, new ID(item.id.client, item.id.clock + length))
                }
                item.delete(transaction)
                length -= item.length
            }
            item = item.right
        }
        if (length > 0) {
            throw new Error('Length exceeded!')
        }
        if (this._searchMarker) {
            ArraySearchMarker_.updateChanges(this._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */)
        }
    }


    // this -> parent
    mapDelete(transaction: Transaction, key: string) {
        const c = this._map.get(key)
        if (c !== undefined) { c.delete(transaction) }
    }

    // this -> parent
    mapSet(transaction: Transaction, key: string, value: Contentable_) {
        const left = this._map.get(key) || null
        const doc = transaction.doc
        const ownClientId = doc.clientID
        let content: Content_
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
        const id = new ID(ownClientId, doc.store.getState(ownClientId))
        new Item(id, left, left && left.lastID, null, null, this, key, content)
            .integrate(transaction, 0)
    }

    // this -> parent
    mapGet(key: string): Contentable_ {
        const val = this._map.get(key)
        return val !== undefined && !val.deleted ? val.content.getContent()[val.length - 1] : undefined
    }

    // this -> parent
    mapGetAll (): { [s: string]: Contentable_ } {
        const res: { [s: string]: any } = {}
        this._map.forEach((value, key) => {
            if (!value.deleted) {
                res[key] = value.content.getContent()[value.length - 1]
            }
        })
        return res
    }
    
    // this -> parent
    mapHas(key: string): boolean {
        const val = this._map.get(key)
        return val !== undefined && !val.deleted
    }

    // this -> parent
    mapGetSnapshot(key: string, snapshot: Snapshot): Contentable_ {
        let v = this._map.get(key) || null
        while (v !== null && (!snapshot.sv.has(v.id.client) || v.id.clock >= (snapshot.sv.get(v.id.client) || 0))) {
            v = v.left
        }
        return v !== null && v.isVisible(snapshot) ? v.content.getContent()[v.length - 1] : undefined
    }

    // ================================================================================================================ //
    // MARK: - Private Methods (Temporally public) -
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item|null) {
        this.doc = y
        this._item = item
    }

    _write (_encoder: UpdateEncoderAny_) {}

    /**
     * Creates YEvent and calls all type observers.
     * Must be implemented by each type.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, _parentSubs: Set<null|string>) {
        if (!transaction.local && this._searchMarker) {
            this._searchMarker.length = 0
        }
    }

    /** Observe all events that are created on this type. */
    observe(f: (type: EventType, transaction: Transaction) => void) {
        this._eH.addListener(f)
    }

    /** Observe all events that are created by this type and its children. */
    observeDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void) {
        this._dEH.addListener(f)
    }

    /** Unregister an observer function. */
    unobserve(f: (type: EventType, transaction: Transaction) => void) {
        this._eH.addListener(f)
    }

    /** Unregister an observer function. */
    unobserveDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void) {
        this._dEH.removeListener(f)
    }

    toJSON(): any {}

    /**
     * Convenient helper to log type information.
     * Do not use in productive systems as the output can be immense!
     */
    logType() {
        const res = []
        let item = this._start
        while (item) {
            res.push(item)
            item = item.right
        }
        console.log('Children: ', res)
        console.log('Children content: ', res.filter(m => !m.deleted).map(m => m.content))
    }
}