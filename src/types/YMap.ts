import {
    YEvent,
    YMapRefID,
    Doc, Transaction, Item,
    UpdateEncoderAny_, UpdateDecoderAny_
} from '../internals'
import { AbstractType_, Contentable_ } from "./AbstractType_"

import * as lib0 from "lib0-typescript"

/** Event that describes the changes on a YMap. */
export class YMapEvent<T extends Contentable_> extends YEvent<YMap<T>> {
    keysChanged: Set<any>

    /**
     * @param {YMap<T>} ymap The YArray that changed.
     * @param {Transaction} transaction
     * @param {Set<any>} subs The keys that changed.
     */
    constructor(ymap: YMap<T>, transaction: Transaction, keysChanged: Set<string | null>) {
        super(ymap, transaction)
        this.keysChanged = keysChanged
    }
}

/**
 * @template MapType
 * A shared Map implementation.
 *
 * @extends AbstractType_<YMapEvent<MapType>>
 * @implements {Iterable<MapType>}
 */
export class YMap<MapType extends Contentable_> extends AbstractType_<YMapEvent<MapType>> implements Iterable<MapType> {
    _prelimContent: Map<string, any> | null

    /**
     *
     * @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
     */
    constructor(entries: Iterable<readonly [string, any]> | undefined = undefined) {
        super()
        this._prelimContent = null

        if (entries === undefined) {
            this._prelimContent = new Map()
        } else {
            this._prelimContent = new Map(entries)
        }
    }

    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item) {
        super._integrate(y, item);
        
        (this._prelimContent as Map<string, any>).forEach((value, key) => {
            this.set(key, value)
        })
        this._prelimContent = null
    }

    _copy(): YMap<MapType> {
        return new YMap<MapType>()
    }

    clone(): YMap<MapType> {
        const map = new YMap<MapType>()
        this.forEach((value, key) => {
            map.set(key, value instanceof AbstractType_ ? (value.clone() as typeof value) : value)
        })
        return map
    }

    /**
     * Creates YMapEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>) {
        this.callObservers(transaction, new YMapEvent(this, transaction, parentSubs))
    }

    /** Transforms this Shared Type to a JSON object. */
    toJSON(): { [s: string]: any } {
        const map: { [s: string]: MapType } = {}
        this._map.forEach((item, key) => {
            if (!item.deleted) {
                const v = item.content.getContent()[item.length - 1]
                map[key] = v instanceof AbstractType_ ? v.toJSON() : v
            }
        })
        return map
    }

    private createMapIterator(): IterableIterator<any[]> {
        return lib0.filterIterator(this._map.entries(), entry => !entry[1].deleted)
    }    

    /** Returns the size of the YMap (count of key/value pairs) */
    get size(): number {
        return [...this.createMapIterator()].length
    }

    /** Returns the keys for each element in the YMap Type. */
    keys(): IterableIterator<string> {
        return lib0.mapIterator(this.createMapIterator(), (v: any[]) => v[0])
    }

    /** Returns the values for each element in the YMap Type. */
    values(): IterableIterator<any> {
        return lib0.mapIterator(this.createMapIterator(), (v: any) => v[1].content.getContent()[v[1].length - 1])
    }

    /** Returns an Iterator of [key, value] pairs */
    entries(): IterableIterator<any> {
        return lib0.mapIterator(this.createMapIterator(), (v: any) => [v[0], v[1].content.getContent()[v[1].length - 1]])
    }

    /** Executes a provided function on once on every key-value pair. */
    forEach(f: (element: MapType, key: string, map: YMap<MapType>) => void) {
        this._map.forEach((item, key) => {
            if (!item.deleted) {
                f(item.content.getContent()[item.length - 1], key, this)
            }
        })
    }

    /** Returns an Iterator of [key, value] pairs */
    [Symbol.iterator](): IterableIterator<any> {
        return this.entries()
    }

    /** Remove a specified element from this YMap. */
    delete(key: string) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.mapDelete(transaction, key)
            })
        } else {
            (this._prelimContent as Map<string, any>).delete(key)
        }
    }

    /** Adds or updates an element with a specified key and value. */
    set(key: string, value: MapType) {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.mapSet(transaction, key, value as any)
            })
        } else {
            (this._prelimContent as Map<string, any>).set(key, value)
        }
        return value
    }

    /** Returns a specified element from this YMap. */
    get(key: string): MapType | undefined {
        return this.mapGet(key) as any
    }

    /** Returns a boolean indicating whether the specified key exists or not. */
    has(key: string): boolean {
        return this.mapHas(key)
    }

    /** Removes all elements from this YMap. */
    clear() {
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.forEach(function (_value, key, map) {
                    map.mapDelete(transaction, key)
                })
            })
        } else {
            (this._prelimContent as Map<string, any>).clear()
        }
    }

    _write(encoder: UpdateEncoderAny_) {
        encoder.writeTypeRef(YMapRefID)
    }
}

export const readYMap = (_decoder: UpdateDecoderAny_) => {
    return new YMap()
}
