import { AbstractType_ } from "../types/AbstractType_"

import {
    YEvent, YArrayRefID, transact,
    Doc, Transaction, Item, // eslint-disable-line
    ArraySearchMarker_,
    UpdateEncoderAny_,
    UpdateDecoderAny_, 
    Contentable_
} from '../internals'

/** Event that describes the changes on a YArray */
export class YArrayEvent<T extends Contentable_> extends YEvent<YArray<T>> {
    _transaction: Transaction

    /**
     * @param {YArray<T>} yarray The changed type
     * @param {Transaction} transaction The transaction object
     */
    constructor(yarray: YArray<T>, transaction: Transaction) {
        super(yarray, transaction)
        this._transaction = transaction
    }
}

/** A shared Array implementation. */
export class YArray<T extends Contentable_> extends AbstractType_<YArrayEvent<T>> implements Iterable<T> {
    _prelimContent: any[]|null = []
    _searchMarker: ArraySearchMarker_[] = []

    constructor () { super() }

    /** Construct a new YArray containing the specified items. */
    static from<T extends Contentable_>(items: T[]): YArray<T> {
        const a = new YArray<T>()
        a.push(items)
        return a
    }

    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item) {
        super._integrate(y, item)
        this.insert(0, this._prelimContent ?? [])
        this._prelimContent = null
    }

    _copy(): YArray<T> { return new YArray() }

    clone(): YArray<T> {
        const array = new YArray<T>()
        array.insert(0, this.toArray().map(element =>
            element instanceof AbstractType_ 
                ? (element.clone() as typeof element)
                : element
        ))
        return array
    }

    get length(): number {
        return this._prelimContent === null ? this._length : this._prelimContent.length
    }

    /**
     * Creates YArrayEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>) {
        super._callObserver(transaction, parentSubs)
        this.callObservers(transaction, new YArrayEvent(this, transaction))
    }

    /**
     * Inserts new content at an index.
     *
     * Important: This function expects an array of content. Not just a content
     * object. The reason for this "weirdness" is that inserting several elements
     * is very efficient when it is done as a single operation.
     *
     * @example
     *    // Insert character 'a' at position 0
     *    yarray.insert(0, ['a'])
     *    // Insert numbers 1, 2 at position 1
     *    yarray.insert(1, [1, 2])
     *
     * @param {number} index The index to insert content at.
     * @param {Array<T>} content The array of content
     */
    insert(index: number, content: Array<T>) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                this.listInsertGenerics(transaction, index, content as any)
            })
        } else {
            (this._prelimContent as any[]).splice(index, 0, ...content)
        }
    }

    /**
     * Appends content to this YArray.
     *
     * @param {Array<T>} content Array of content to append.
     *
     * @todo Use the following implementation in all types.
     */
    push(content: Array<T>) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                this.listPushGenerics(transaction, content as any)
            })
        } else {
            (this._prelimContent as any[]).push(...content)
        }
    }

    /**
     * Preppends content to this YArray.
     *
     * @param {Array<T>} content Array of content to preppend.
     */
    unshift(content: T[]) {
        this.insert(0, content)
    }

    /**
     * Deletes elements starting from an index.
     *
     * @param {number} index Index at which to start deleting elements
     * @param {number} length The number of elements to remove. Defaults to 1.
     */
    delete(index: number, length: number = 1) {
        if (this.doc !== null) {
            transact(this.doc, transaction => {
                this.listDelete(transaction, index, length)
            })
        } else {
            (this._prelimContent as any[]).splice(index, length)
        }
    }

    /**
     * Returns the i-th element from a YArray.
     *
     * @param {number} index The index of the element to return from the YArray
     * @return {T}
     */
    get(index: number): T {
        return this.listGet(index)
    }

    /** Transforms this YArray to a JavaScript Array. */
    toArray(): T[] {
        return this.listToArray()
    }

    /** Transforms this YArray to a JavaScript Array. */
    slice(start: number = 0, end: number = this.length): Array<T> {
        return this.listSlice(start, end)
    }

    /**
     * Transforms this Shared Type to a JSON object.
     */
    toJSON(): Array<any> {
        return this.map((c: T) => c instanceof AbstractType_ ? c.toJSON() : c)
    }

    /**
     * Returns an Array with the result of calling a provided function on every
     * element of this YArray.
     *
     * @template M
     * @param {function(T,number,YArray<T>):M} f Function that produces an element of the new Array
     * @return {Array<M>} A new array with each element being the result of the
     *                                 callback function
     */
    map<M>(func: (element: T, index: number, array: YArray<T>) => M): Array<M> {
        return this.listMap(func as any)
    }

    /**
     * Executes a provided function on once on overy element of this YArray.
     *
     * @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
     */
    forEach(f: (element: T, index: number, array: YArray<T>) => void) {
        this.listForEach(f)
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.listCreateIterator()
    }

    _write(encoder: UpdateEncoderAny_) {
        encoder.writeTypeRef(YArrayRefID)
    }
}

export const readYArray = (_decoder: UpdateDecoderAny_) => {
    return new YArray()
}
