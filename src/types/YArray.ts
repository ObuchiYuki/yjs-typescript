/**
 * @module YArray
 */

import {
    YEvent,
    AbstractType,
    typeListGet,
    typeListToArray,
    typeListForEach,
    typeListCreateIterator,
    typeListInsertGenerics,
    typeListPushGenerics,
    typeListDelete,
    typeListMap,
    YArrayRefID,
    callTypeObservers,
    transact,
    ArraySearchMarker, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Transaction, Item // eslint-disable-line
} from '../internals'
import { typeListSlice } from './AbstractType'

/** Event that describes the changes on a YArray */
export class YArrayEvent<T> extends YEvent<YArray<T>> {
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
export class YArray<T> extends AbstractType<YArrayEvent<T>> implements Iterable<T> {
    _prelimContent: any[]|null = []
    _searchMarker: ArraySearchMarker[] = []

    constructor () { super() }

    /** Construct a new YArray containing the specified items. */
    static from<T>(items: T[]): YArray<T> {
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
        this.insert(0, this._prelimContent as any[])
        this._prelimContent = null
    }

    _copy(): YArray<T> { return new YArray() }

    clone(): YArray<T> {
        const arr = new YArray<T>()
        arr.insert(0, this.toArray().map(el =>
            el instanceof AbstractType ? (el.clone() as typeof el) : el
        ))
        return arr
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
        callTypeObservers(this, transaction, new YArrayEvent(this, transaction))
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
                typeListInsertGenerics(transaction, this, index, content as any)
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
                typeListPushGenerics(transaction, this, content as any)
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
                typeListDelete(transaction, this, index, length)
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
        return typeListGet(this, index)
    }

    /** Transforms this YArray to a JavaScript Array. */
    toArray(): T[] {
        return typeListToArray(this)
    }

    /** Transforms this YArray to a JavaScript Array. */
    slice(start: number = 0, end: number = this.length): Array<T> {
        return typeListSlice(this, start, end)
    }

    /**
     * Transforms this Shared Type to a JSON object.
     */
    toJSON(): Array<any> {
        return this.map((c: T) => c instanceof AbstractType ? c.toJSON() : c)
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
        return typeListMap(this, func as any)
    }

    /**
     * Executes a provided function on once on overy element of this YArray.
     *
     * @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
     */
    forEach(f: (element: T, index: number, array: YArray<T>) => void) {
        typeListForEach(this, f)
    }

    [Symbol.iterator](): IterableIterator<T> {
        return typeListCreateIterator(this)
    }

    _write(encoder: UpdateEncoderV1 | UpdateEncoderV2) {
        encoder.writeTypeRef(YArrayRefID)
    }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 *
 * @private
 * @function
 */
export const readYArray = (_decoder: UpdateDecoderV1 | UpdateDecoderV2) => {
    return new YArray()
}
