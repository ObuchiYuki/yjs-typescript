
/**
 * @module YText
 */

import {
    YEvent,
    AbstractType,
    getItemCleanStart,
    getState,
    isVisible,
    createID,
    YTextRefID,
    callTypeObservers,
    transact,
    ContentEmbed,
    GC,
    ContentFormat,
    ContentString,
    splitSnapshotAffectedStructs,
    iterateDeletedStructs,
    iterateStructs,
    findMarker,
    typeMapDelete,
    typeMapSet,
    typeMapGet,
    typeMapGetAll,
    updateMarkerChanges,
    ContentType,
    ArraySearchMarker, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, ID, Doc, Item, Snapshot, Transaction // eslint-disable-line
} from 'yjs/dist/src/internals'

import * as object from 'lib0/object'
import * as map from 'lib0/map'
import * as error from 'lib0/error'

const equalAttrs = (a: any, b: any): boolean => {
    if (a === b) return true
    if (typeof a === 'object' && typeof b === 'object') {
        return (a && b && object.equalFlat(a, b))
    }
    return false
}

export class ItemTextListPosition {
    constructor(
        public left: Item | null,
        public right: Item | null,
        public index: number,
        public currentAttributes: Map<string, any>
    ) {}

    /** Only call this if you know that this.right is defined */
    forward() {
        if (this.right === null) { error.unexpectedCase() }
        switch (this.right.content.constructor) {
            case ContentFormat:
                if (!this.right.deleted) {
                    updateCurrentAttributes(this.currentAttributes, this.right.content as ContentFormat)
                }
                break
            default:
                if (!this.right.deleted) {
                    this.index += this.right.length
                }
                break
        }
        this.left = this.right
        this.right = this.right.right
    }
}

/**
 * @param {Transaction} transaction
 * @param {ItemTextListPosition} pos
 * @param {number} count steps to move forward
 * @return {ItemTextListPosition}
 *
 * @private
 * @function
 */
const findNextPosition = (transaction: Transaction, pos: ItemTextListPosition, count: number): ItemTextListPosition => {
    while (pos.right !== null && count > 0) {
        switch (pos.right.content.constructor) {
            case ContentFormat:
                if (!pos.right.deleted) {
                    updateCurrentAttributes(pos.currentAttributes, pos.right.content as ContentFormat)
                }
                break
            default:
                if (!pos.right.deleted) {
                    if (count < pos.right.length) {
                        // split right
                        getItemCleanStart(transaction, createID(pos.right.id.client, pos.right.id.clock + count))
                    }
                    pos.index += pos.right.length
                    count -= pos.right.length
                }
                break
        }
        pos.left = pos.right
        pos.right = pos.right.right
        // pos.forward() - we don't forward because that would halve the performance because we already do the checks above
    }
    return pos
}

const findPosition = (transaction: Transaction, parent: AbstractType<any>, index: number): ItemTextListPosition => {
    const currentAttributes = new Map()
    const marker = findMarker(parent, index)
    if (marker) {
        const pos = new ItemTextListPosition(marker.p.left, marker.p, marker.index, currentAttributes)
        return findNextPosition(transaction, pos, index - marker.index)
    } else {
        const pos = new ItemTextListPosition(null, parent._start, 0, currentAttributes)
        return findNextPosition(transaction, pos, index)
    }
}

/** Negate applied formats */
const insertNegatedAttributes = (transaction: Transaction, parent: AbstractType<any>, currPos: ItemTextListPosition, negatedAttributes: Map<string, any>) => {
    // check if we really need to remove attributes
    while (
        currPos.right !== null && (
            currPos.right.deleted === true || (
                currPos.right.content.constructor === ContentFormat &&
                equalAttrs(
                    negatedAttributes.get((currPos.right.content as ContentFormat).key),
                    (currPos.right.content as ContentFormat).value
                )
            )
        )
    ) {
        if (!currPos.right.deleted) {
            negatedAttributes.delete((currPos.right.content as ContentFormat).key)
        }
        currPos.forward()
    }
    const doc = transaction.doc
    const ownClientId = doc.clientID
    negatedAttributes.forEach((val, key) => {
        const left = currPos.left
        const right = currPos.right
        const nextFormat = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val))
        nextFormat.integrate(transaction, 0)
        currPos.right = nextFormat
        currPos.forward()
    })
}

const updateCurrentAttributes = (currentAttributes: Map<string, any>, format: ContentFormat) => {
    const { key, value } = format
    if (value === null) {
        currentAttributes.delete(key)
    } else {
        currentAttributes.set(key, value)
    }
}

const minimizeAttributeChanges = (currPos: ItemTextListPosition, attributes: { [s: string]: any }) => {
    // go right while attributes[right.key] === right.value (or right is deleted)
    while (true) {
        if (currPos.right === null) {
            break
        } else if (currPos.right.deleted || (currPos.right.content.constructor === ContentFormat && equalAttrs(attributes[(currPos.right.content as ContentFormat).key] || null, (currPos.right.content as ContentFormat).value))) {
            //
        } else {
            break
        }
        currPos.forward()
    }
}

const insertAttributes = (transaction: Transaction, parent: AbstractType<any>, currPos: ItemTextListPosition, attributes: { [s: string]: any }): Map<string, any> => {
    const doc = transaction.doc
    const ownClientId = doc.clientID
    const negatedAttributes = new Map()
    // insert format-start items
    for (const key in attributes) {
        const val = attributes[key]
        const currentVal = currPos.currentAttributes.get(key) || null
        if (!equalAttrs(currentVal, val)) {
            // save negated attribute (set null if currentVal undefined)
            negatedAttributes.set(key, currentVal)
            const { left, right } = currPos
            currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val))
            currPos.right.integrate(transaction, 0)
            currPos.forward()
        }
    }
    return negatedAttributes
}

const insertText = (transaction: Transaction, parent: AbstractType<any>, currPos: ItemTextListPosition, text: string | object | AbstractType<any>, attributes: { [s: string]: any }) => {
    currPos.currentAttributes.forEach((_val, key) => {
        if (attributes[key] === undefined) {
            attributes[key] = null
        }
    })
    const doc = transaction.doc
    const ownClientId = doc.clientID
    minimizeAttributeChanges(currPos, attributes)
    const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes)
    // insert content
    const content = text.constructor === String ? new ContentString(/** @type {string} */ (text)) : (text instanceof AbstractType ? new ContentType(text) : new ContentEmbed(text))
    let { left, right, index } = currPos
    if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, currPos.index, content.getLength())
    }
    right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, content)
    right.integrate(transaction, 0)
    currPos.right = right
    currPos.index = index
    currPos.forward()
    insertNegatedAttributes(transaction, parent, currPos, negatedAttributes)
}

const formatText = (transaction: Transaction, parent: AbstractType<any>, currPos: ItemTextListPosition, length: number, attributes: { [s: string]: any }) => {
    const doc = transaction.doc
    const ownClientId = doc.clientID
    minimizeAttributeChanges(currPos, attributes)
    const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes)
    // iterate until first non-format or null is found
    // delete all formats with attributes[format.key] != null
    // also check the attributes after the first non-format as we do not want to insert redundant negated attributes there
    // eslint-disable-next-line no-labels
    iterationLoop: while (
        currPos.right !== null &&
        (length > 0 ||
            (
                negatedAttributes.size > 0 &&
                (currPos.right.deleted || currPos.right.content.constructor === ContentFormat)
            )
        )
    ) {
        if (!currPos.right.deleted) {
            switch (currPos.right.content.constructor) {
                case ContentFormat: {
                    const { key, value } = currPos.right.content as ContentFormat
                    const attr = attributes[key]
                    if (attr !== undefined) {
                        if (equalAttrs(attr, value)) {
                            negatedAttributes.delete(key)
                        } else {
                            if (length === 0) {
                                // no need to further extend negatedAttributes
                                // eslint-disable-next-line no-labels
                                break iterationLoop
                            }
                            negatedAttributes.set(key, value)
                        }
                        currPos.right.delete(transaction)
                    } else {
                        currPos.currentAttributes.set(key, value)
                    }
                    break
                }
                default:
                    if (length < currPos.right.length) {
                        getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length))
                    }
                    length -= currPos.right.length
                    break
            }
        }
        currPos.forward()
    }
    // Quill just assumes that the editor starts with a newline and that it always
    // ends with a newline. We only insert that newline when a new newline is
    // inserted - i.e when length is bigger than type.length
    if (length > 0) {
        let newlines = ''
        for (; length > 0; length--) {
            newlines += '\n'
        }
        currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), currPos.left, currPos.left && currPos.left.lastId, currPos.right, currPos.right && currPos.right.id, parent, null, new ContentString(newlines))
        currPos.right.integrate(transaction, 0)
        currPos.forward()
    }
    insertNegatedAttributes(transaction, parent, currPos, negatedAttributes)
}

/**
 * Call this function after string content has been deleted in order to
 * clean up formatting Items.
 *
 * @param {Transaction} transaction
 * @param {Item} start
 * @param {Item|null} curr exclusive end, automatically iterates to the next Content Item
 * @param {Map<string,any>} startAttributes
 * @param {Map<string,any>} currAttributes
 * @return {number} The amount of formatting Items deleted.
 *
 * @function
 */
const cleanupFormattingGap = (transaction: Transaction, start: Item, curr: Item | null, startAttributes: Map<string, any>, currAttributes: Map<string, any>): number => {
    let end: Item | null = start
    const endFormats: Map<string, ContentFormat> = map.create()
    while (end && (!end.countable || end.deleted)) {
        if (!end.deleted && end.content.constructor === ContentFormat) {
            const cf = end.content as ContentFormat
            endFormats.set(cf.key, cf)
        }
        end = end.right
    }
    let cleanups = 0
    let reachedCurr = false
    while (start !== end) {
        if (curr === start) {
            reachedCurr = true
        }
        if (!start.deleted) {
            const content = start.content
            switch (content.constructor) {
                case ContentFormat: {
                    const { key, value } = content as ContentFormat
                    const startAttrValue = startAttributes.get(key) || null
                    if (endFormats.get(key) !== content || startAttrValue === value) {
                        // Either this format is overwritten or it is not necessary because the attribute already existed.
                        start.delete(transaction)
                        cleanups++
                        if (!reachedCurr && (currAttributes.get(key) || null) === value && startAttrValue !== value) {
                            if (startAttrValue === null) {
                                currAttributes.delete(key)
                            } else {
                                currAttributes.set(key, startAttrValue)
                            }
                        }
                    }
                    if (!reachedCurr && !start.deleted) {
                        updateCurrentAttributes(currAttributes, content as ContentFormat)
                    }
                    break
                }
            }
        }
        start = start.right as Item
    }
    return cleanups
}

const cleanupContextlessFormattingGap = (transaction: Transaction, item: Item | null) => {
    // iterate until item.right is null or content
    while (item && item.right && (item.right.deleted || !item.right.countable)) {
        item = item.right
    }
    const attrs = new Set()
    // iterate back until a content item is found
    while (item && (item.deleted || !item.countable)) {
        if (!item.deleted && item.content.constructor === ContentFormat) {
            const key = (item.content as ContentFormat).key
            if (attrs.has(key)) {
                item.delete(transaction)
            } else {
                attrs.add(key)
            }
        }
        item = item.left
    }
}

/**
 * This function is experimental and subject to change / be removed.
 *
 * Ideally, we don't need this function at all. Formatting attributes should be cleaned up
 * automatically after each change. This function iterates twice over the complete YText type
 * and removes unnecessary formatting attributes. This is also helpful for testing.
 *
 * This function won't be exported anymore as soon as there is confidence that the YText type works as intended.
 *
 * @param {YText} type
 * @return {number} How many formatting attributes have been cleaned up.
 */
export const cleanupYTextFormatting = (type: YText): number => {
    let res = 0
    transact((type.doc as Doc), transaction => {
        let start = type._start as Item
        let end = type._start
        let startAttributes = map.create()
        const currentAttributes = map.copy(startAttributes)
        while (end) {
            if (end.deleted === false) {
                switch (end.content.constructor) {
                    case ContentFormat:
                        updateCurrentAttributes(currentAttributes, end.content as ContentFormat)
                        break
                    default:
                        res += cleanupFormattingGap(transaction, start, end, startAttributes, currentAttributes)
                        startAttributes = map.copy(currentAttributes)
                        start = end
                        break
                }
            }
            end = end.right
        }
    })
    return res
}

const deleteText = (transaction: Transaction, currPos: ItemTextListPosition, length: number): ItemTextListPosition => {
    const startLength = length
    const startAttrs = map.copy(currPos.currentAttributes)
    const start = currPos.right
    while (length > 0 && currPos.right !== null) {
        if (currPos.right.deleted === false) {
            switch (currPos.right.content.constructor) {
                case ContentType:
                case ContentEmbed:
                case ContentString:
                    if (length < currPos.right.length) {
                        getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length))
                    }
                    length -= currPos.right.length
                    currPos.right.delete(transaction)
                    break
            }
        }
        currPos.forward()
    }
    if (start) {
        cleanupFormattingGap(transaction, start, currPos.right, startAttrs, currPos.currentAttributes)
    }
    const parent = ((currPos.left || currPos.right as Item).parent as AbstractType<any>)
    if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, currPos.index, -startLength + length)
    }
    return currPos
}

/**
 * The Quill Delta format represents changes on a text document with
 * formatting information. For mor information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
 *
 * @example
 *     {
 *         ops: [
 *             { insert: 'Gandalf', attributes: { bold: true } },
 *             { insert: ' the ' },
 *             { insert: 'Grey', attributes: { color: '#cccccc' } }
 *         ]
 *     }
 *
 */

/**
    * Attributes that can be assigned to a selection of text.
    *
    * @example
    *     {
    *         bold: true,
    *         font-size: '40px'
    *     }
    */
export type TextAttributes = {
    [s: string]: any
}

export type YTextEventUpdateAction = 'add'|'update'|'delete'
export type YTextEventDelta = {
    insert?: Array<any> | string,
    delete?: number, 
    retain?: number,
    attributes: { [s: string]: any }
}[]

export type YTextEventChange = {
    added: Set<Item>, 
    deleted: Set<Item>, 
    keys: Map<string, { action: YTextEventUpdateAction, oldValue: any }>,
    delta: YTextEventDelta
}


/** Event that describes the changes on a YText type. */
export class YTextEvent extends YEvent<YText> {

    /** Whether the children changed. */
    childListChanged: boolean

    /** Set of all changed attributes. */
    keysChanged: Set<string>

    _delta: YTextEventDelta = []
    _changes: YTextEventChange|null = null

    /**
     * @param {YText} ytext
     * @param {Transaction} transaction
     * @param {Set<any>} subs The keys that changed
     */
    constructor(ytext: YText, transaction: Transaction, subs: Set<any>) {
        super(ytext, transaction)

        this.childListChanged = false
        this.keysChanged = new Set()

        subs.forEach((sub) => {
            if (sub === null) {
                this.childListChanged = true
            } else {
                this.keysChanged.add(sub)
            }
        })
    }

    get changes(): YTextEventChange {
        if (this._changes === null) {
            this._changes = { keys: this.keys, delta: this.delta, added: new Set(), deleted: new Set() }
        }
        return this._changes
    }

    /**
     * Compute the changes in the delta format.
     * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
     */
    get delta(): YTextEventDelta {
        if (this._delta === null) {
            const y = this.target.doc as Doc
            
            const delta: YTextEventDelta = []

            transact(y, transaction => {
                const currentAttributes = new Map() // saves all current attributes for insert
                const oldAttributes = new Map()
                let item = this.target._start
                let action: string | null = null
                
                const attributes: { [s: string]: any } = {} // counts added or removed new attributes for retain
                
                let insert: string|object = ''
                let retain = 0
                let deleteLen = 0
                const addOp = () => {
                    if (action !== null) {
                        let op: any
                        switch (action) {
                            case 'delete':
                                op = { delete: deleteLen }
                                deleteLen = 0
                                break
                            case 'insert':
                                op = { insert }
                                if (currentAttributes.size > 0) {
                                    op.attributes = {}
                                    currentAttributes.forEach((value, key) => {
                                        if (value !== null) {
                                            op.attributes[key] = value
                                        }
                                    })
                                }
                                insert = ''
                                break
                            case 'retain':
                                op = { retain }
                                if (Object.keys(attributes).length > 0) {
                                    op.attributes = {}
                                    for (const key in attributes) {
                                        op.attributes[key] = attributes[key]
                                    }
                                }
                                retain = 0
                                break
                        }
                        delta.push(op)
                        action = null
                    }
                }
                while (item !== null) {
                    switch (item.content.constructor) {
                        case ContentType:
                        case ContentEmbed:
                            if (this.adds(item)) {
                                if (!this.deletes(item)) {
                                    addOp()
                                    action = 'insert'
                                    insert = item.content.getContent()[0]
                                    addOp()
                                }
                            } else if (this.deletes(item)) {
                                if (action !== 'delete') {
                                    addOp()
                                    action = 'delete'
                                }
                                deleteLen += 1
                            } else if (!item.deleted) {
                                if (action !== 'retain') {
                                    addOp()
                                    action = 'retain'
                                }
                                retain += 1
                            }
                            break
                        case ContentString:
                            if (this.adds(item)) {
                                if (!this.deletes(item)) {
                                    if (action !== 'insert') {
                                        addOp()
                                        action = 'insert'
                                    }
                                    insert += (item.content as ContentString).str
                                }
                            } else if (this.deletes(item)) {
                                if (action !== 'delete') {
                                    addOp()
                                    action = 'delete'
                                }
                                deleteLen += item.length
                            } else if (!item.deleted) {
                                if (action !== 'retain') {
                                    addOp()
                                    action = 'retain'
                                }
                                retain += item.length
                            }
                            break
                        case ContentFormat: {
                            const { key, value } = (item.content as ContentFormat)
                            if (this.adds(item)) {
                                if (!this.deletes(item)) {
                                    const curVal = currentAttributes.get(key) || null
                                    if (!equalAttrs(curVal, value)) {
                                        if (action === 'retain') {
                                            addOp()
                                        }
                                        if (equalAttrs(value, (oldAttributes.get(key) || null))) {
                                            delete attributes[key]
                                        } else {
                                            attributes[key] = value
                                        }
                                    } else if (value !== null) {
                                        item.delete(transaction)
                                    }
                                }
                            } else if (this.deletes(item)) {
                                oldAttributes.set(key, value)
                                const curVal = currentAttributes.get(key) || null
                                if (!equalAttrs(curVal, value)) {
                                    if (action === 'retain') {
                                        addOp()
                                    }
                                    attributes[key] = curVal
                                }
                            } else if (!item.deleted) {
                                oldAttributes.set(key, value)
                                const attr = attributes[key]
                                if (attr !== undefined) {
                                    if (!equalAttrs(attr, value)) {
                                        if (action === 'retain') {
                                            addOp()
                                        }
                                        if (value === null) {
                                            delete attributes[key]
                                        } else {
                                            attributes[key] = value
                                        }
                                    } else if (attr !== null) { // this will be cleaned up automatically by the contextless cleanup function
                                        item.delete(transaction)
                                    }
                                }
                            }
                            if (!item.deleted) {
                                if (action === 'insert') {
                                    addOp()
                                }
                                updateCurrentAttributes(currentAttributes, (item.content as ContentFormat))
                            }
                            break
                        }
                    }
                    item = item.right
                }
                addOp()
                while (delta.length > 0) {
                    const lastOp = delta[delta.length - 1]
                    if (lastOp.retain !== undefined && lastOp.attributes === undefined) {
                        // retain delta's if they don't assign attributes
                        delta.pop()
                    } else {
                        break
                    }
                }
            })
            this._delta = delta
        }
        return /** @type {any} */ (this._delta)
    }
}

/**
 * Type that represents text with formatting information.
 *
 * This type replaces y-richtext as this implementation is able to handle
 * block formats (format information on a paragraph), embeds (complex elements
 * like pictures and videos), and text formats (**bold**, *italic*).
 */
export class YText extends AbstractType<YTextEvent> {
    
    /** Array of pending operations on this type */
    _pending: (() => void)[] | null

    /**
     * @param {String} [string] The initial value of the YText.
     */
    constructor(string?: string) {
        super()
        
        this._pending = string !== undefined ? [() => this.insert(0, string)] : []
        this._searchMarker = []
    }

    /** Number of characters of this text type. */
    get length(): number { return this._length }

    _integrate(y: Doc, item: Item) {
        super._integrate(y, item)

        try {
            (this._pending)?.forEach(f => f())
        } catch (e) {
            console.error(e)
        }
        this._pending = null
    }

    _copy(): YText {
        return new YText()
    }

    clone(): YText {
        const text = new YText()
        text.applyDelta(this.toDelta())
        return text
    }

    /**
     * Creates YTextEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>) {
        super._callObserver(transaction, parentSubs)
        const event = new YTextEvent(this, transaction, parentSubs)
        const doc = transaction.doc
        callTypeObservers(this, transaction, event)
        // If a remote change happened, we try to cleanup potential formatting duplicates.
        if (!transaction.local) {
            // check if another formatting item was inserted
            let foundFormattingItem = false
            for (const [client, afterClock] of transaction.afterState.entries()) {
                const clock = transaction.beforeState.get(client) || 0
                if (afterClock === clock) {
                    continue
                }
                iterateStructs(transaction,(doc.store.clients.get(client) as (Item|GC)[]), clock, afterClock, item => {
                    if (!item.deleted && (item as Item).content.constructor === ContentFormat) {
                        foundFormattingItem = true
                    }
                })
                if (foundFormattingItem) {
                    break
                }
            }
            if (!foundFormattingItem) {
                iterateDeletedStructs(transaction, transaction.deleteSet, item => {
                    if (item instanceof GC || foundFormattingItem) {
                        return
                    }
                    if (item.parent === this && item.content.constructor === ContentFormat) {
                        foundFormattingItem = true
                    }
                })
            }
            transact(doc, (t) => {
                if (foundFormattingItem) {
                    // If a formatting item was inserted, we simply clean the whole type.
                    // We need to compute currentAttributes for the current position anyway.
                    cleanupYTextFormatting(this)
                } else {
                    // If no formatting attribute was inserted, we can make due with contextless
                    // formatting cleanups.
                    // Contextless: it is not necessary to compute currentAttributes for the affected position.
                    iterateDeletedStructs(t, t.deleteSet, item => {
                        if (item instanceof GC) {
                            return
                        }
                        if (item.parent === this) {
                            cleanupContextlessFormattingGap(t, item)
                        }
                    })
                }
            })
        }
    }

    /** Returns the unformatted string representation of this YText type. */
    toString(): string {
        let str = ''
        let n: Item|null = this._start
        while (n !== null) {
            if (!n.deleted && n.countable && n.content.constructor === ContentString) {
                str += (n.content as ContentString).str
            }
            n = n.right
        }
        return str
    }

    /**Returns the unformatted string representation of this YText type. */
    toJSON(): string {
        return this.toString()
    }

    /**
     * Apply a {@link Delta} on this shared YText type.
     *
     * @param {any} delta The changes to apply on this element.
     * @param {object}    opts
     * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
     *
     *
     * @public
     */
    applyDelta(delta: any, { sanitize = true }: { sanitize?: boolean } = {}) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                const currPos = new ItemTextListPosition(null, this._start, 0, new Map())
                for (let i = 0; i < delta.length; i++) {
                    const op = delta[i]
                    if (op.insert !== undefined) {
                        // Quill assumes that the content starts with an empty paragraph.
                        // Yjs/Y.Text assumes that it starts empty. We always hide that
                        // there is a newline at the end of the content.
                        // If we omit this step, clients will see a different number of
                        // paragraphs, but nothing bad will happen.
                        const ins = (!sanitize && typeof op.insert === 'string' && i === delta.length - 1 && currPos.right === null && op.insert.slice(-1) === '\n') ? op.insert.slice(0, -1) : op.insert
                        if (typeof ins !== 'string' || ins.length > 0) {
                            insertText(transaction, this, currPos, ins, op.attributes || {})
                        }
                    } else if (op.retain !== undefined) {
                        formatText(transaction, this, currPos, op.retain, op.attributes || {})
                    } else if (op.delete !== undefined) {
                        deleteText(transaction, currPos, op.delete)
                    }
                }
            })
        } else {
            this._pending?.push(() => this.applyDelta(delta))
        }
    }

    /** Returns the Delta representation of this YText type. */
    toDelta(snapshot?: Snapshot, prevSnapshot?: Snapshot, computeYChange?: (action: 'removed' | 'added', id: ID) => any): any {
        const ops: any[] = []
        const currentAttributes = new Map()
        const doc = this.doc as Doc
        let str = ''
        let n = this._start
        function packStr () {
            if (str.length > 0) {
                // pack str with attributes to ops
                const attributes: { [Key: string]: any } = {}
                let addAttributes = false
                currentAttributes.forEach((value, key) => {
                    addAttributes = true
                    attributes[key] = value
                })
                /**
                 * @type {Object<string,any>}
                 */
                const op: { [Key: string]: any } = { insert: str }
                if (addAttributes) {
                    op.attributes = attributes
                }
                ops.push(op)
                str = ''
            }
        }
        // snapshots are merged again after the transaction, so we need to keep the
        // transalive until we are done
        transact(doc, transaction => {
            if (snapshot) {
                splitSnapshotAffectedStructs(transaction, snapshot)
            }
            if (prevSnapshot) {
                splitSnapshotAffectedStructs(transaction, prevSnapshot)
            }
            while (n !== null) {
                if (isVisible(n, snapshot) || (prevSnapshot !== undefined && isVisible(n, prevSnapshot))) {
                    switch (n.content.constructor) {
                        case ContentString: {
                            const cur = currentAttributes.get('ychange')
                            if (snapshot !== undefined && !isVisible(n, snapshot)) {
                                if (cur === undefined || cur.user !== n.id.client || cur.type !== 'removed') {
                                    packStr()
                                    currentAttributes.set('ychange', computeYChange ? computeYChange('removed', n.id) : { type: 'removed' })
                                }
                            } else if (prevSnapshot !== undefined && !isVisible(n, prevSnapshot)) {
                                if (cur === undefined || cur.user !== n.id.client || cur.type !== 'added') {
                                    packStr()
                                    currentAttributes.set('ychange', computeYChange ? computeYChange('added', n.id) : { type: 'added' })
                                }
                            } else if (cur !== undefined) {
                                packStr()
                                currentAttributes.delete('ychange')
                            }
                            str += (n.content as ContentString).str
                            break
                        }
                        case ContentType:
                        case ContentEmbed: {
                            packStr()
                            const op: { [Key: string]: any } = {
                                insert: n.content.getContent()[0]
                            }
                            if (currentAttributes.size > 0) {
                                const attrs: { [Key: string]: any } = ({})
                                op.attributes = attrs
                                currentAttributes.forEach((value, key) => {
                                    attrs[key] = value
                                })
                            }
                            ops.push(op)
                            break
                        }
                        case ContentFormat:
                            if (isVisible(n, snapshot)) {
                                packStr()
                                updateCurrentAttributes(currentAttributes, n.content as ContentFormat)
                            }
                            break
                    }
                }
                n = n.right
            }
            packStr()
        }, 'cleanup')
        return ops
    }

    /**
     * Insert text at a given index.
     *
     * @param {number} index The index at which to start inserting.
     * @param {String} text The text to insert at the specified position.
     * @param {TextAttributes} [attributes] Optionally define some formatting
     *                                                                        information to apply on the inserted
     *                                                                        Text.
     * @public
     */
    insert(index: number, text: string, attributes?: TextAttributes) {
        if (text.length <= 0) {
            return
        }
        const y = this.doc
        if (y !== null) {
            transact(y, transaction => {
                const pos = findPosition(transaction, this, index)
                if (!attributes) {
                    attributes = {}
                    pos.currentAttributes.forEach((v, k) => { attributes![k] = v })
                }
                insertText(transaction, this, pos, text, attributes)
            })
        } else {
            (this._pending)?.push(() => this.insert(index, text, attributes))
        }
    }

    /**
     * Inserts an embed at a index.
     *
     * @param {number} index The index to insert the embed at.
     * @param {Object | AbstractType<any>} embed The Object that represents the embed.
     * @param {TextAttributes} attributes Attribute information to apply on the
     *                                                                        embed
     *
     * @public
     */
    insertEmbed(index: number, embed: object | AbstractType<any>, attributes: TextAttributes = {}) {
        const y = this.doc
        if (y !== null) {
            transact(y, transaction => {
                const pos = findPosition(transaction, this, index)
                insertText(transaction, this, pos, embed, attributes)
            })
        } else {
            (this._pending)?.push(() => this.insertEmbed(index, embed, attributes))
        }
    }

    /**
     * Deletes text starting from an index.
     *
     * @param {number} index Index at which to start deleting.
     * @param {number} length The number of characters to remove. Defaults to 1.
     *
     * @public
     */
    delete(index: number, length: number) {
        if (length === 0) {
            return
        }
        const y = this.doc
        if (y !== null) {
            transact(y, transaction => {
                deleteText(transaction, findPosition(transaction, this, index), length)
            })
        } else {
            (this._pending)?.push(() => this.delete(index, length))
        }
    }

    /**
     * Assigns properties to a range of text.
     *
     * @param {number} index The position where to start formatting.
     * @param {number} length The amount of characters to assign properties to.
     * @param {TextAttributes} attributes Attribute information to apply on the
     *                                                                        text.
     *
     * @public
     */
    format(index: number, length: number, attributes: TextAttributes) {
        if (length === 0) {
            return
        }
        const y = this.doc
        if (y !== null) {
            transact(y, transaction => {
                const pos = findPosition(transaction, this, index)
                if (pos.right === null) {
                    return
                }
                formatText(transaction, this, pos, length, attributes)
            })
        } else {
            this._pending?.push(() => this.format(index, length, attributes))
        }
    }

    /**
     * Removes an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    removeAttribute(attributeName: string) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                typeMapDelete(transaction, this, attributeName)
            })
        } else {
            this._pending?.push(() => this.removeAttribute(attributeName))
        }
    }

    /**
     * Sets or updates an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be set.
     * @param {any} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    setAttribute(attributeName: string, attributeValue: any) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                typeMapSet(transaction, this, attributeName, attributeValue)
            })
        } else {
            this._pending?.push(() => this.setAttribute(attributeName, attributeValue))
        }
    }

    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that identifies the
     *                                                             queried value.
     * @return {any} The queried attribute value.
     *
     * @public
     */
    getAttribute(attributeName: string): any {
        return /** @type {any} */ (typeMapGet(this, attributeName))
    }

    /**
     * Returns all attribute name/value pairs in a JSON Object.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @return {Object<string, any>} A JSON Object that describes the attributes.
     *
     * @public
     */
    getAttributes(): { [s: string]: any } {
        return typeMapGetAll(this)
    }

    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     */
    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2) {
        encoder.writeTypeRef(YTextRefID)
    }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YText}
 *
 * @private
 * @function
 */
export const readYText = (_decoder: UpdateDecoderV1 | UpdateDecoderV2): YText => {
    return new YText()
}