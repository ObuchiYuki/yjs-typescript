/**
 * @module Y
 */

import {
    StructStore,
    AbstractType_,
    YArray,
    YText,
    YMap,
    YXmlFragment,
    ContentDoc, Item, Transaction, YEvent, // eslint-disable-line
    Contentable_,
    generateNewClientID
} from '../internals'

import { Observable } from 'lib0/observable'
import * as random from 'lib0/random'
import * as map from 'lib0/map'
import * as array from 'lib0/array'
import * as promise from 'lib0/promise'

export type DocOpts = {
    gc?: boolean,
    gcFilter?: (item: Item) => boolean,
    guid?: string,
    collectionid?: string | null,
    meta?: any,
    autoLoad?: boolean,
    shouldLoad?: boolean
}

/**
 * A Yjs instance handles the state of shared data.
 * @extends Observable<string>
 */
export class Doc extends Observable<string> {
    gcFilter: (arg0: Item) => boolean
    gc: boolean
    clientID: number
    guid: string
    collectionid: string | null
    share: Map<string, AbstractType_<YEvent<any>>>
    store: StructStore
    subdocs: Set<Doc>
    shouldLoad: boolean
    autoLoad: boolean
    meta: any
    /**
     * This is set to true when the persistence provider loaded the document from the database or when the `sync` event fires.
     * Note that not all providers implement this feature. Provider authors are encouraged to fire the `load` event when the doc content is loaded from the database.
     */
    isLoaded: boolean
    /**
     * This is set to true when the connection provider has successfully synced with a backend.
     * Note that when using peer-to-peer providers this event may not provide very useful.
     * Also note that not all providers implement this feature. Provider authors are encouraged to fire
     * the `sync` event when the doc has been synced (with `true` as a parameter) or if connection is
     * lost (with false as a parameter).
     */
    isSynced: boolean
    /**
     * Promise that resolves once the document has been loaded from a presistence provider.
     */
    whenLoaded: Promise<Doc>
    /**
     * Promise that resolves once the document has been synced with a backend.
     * This promise is recreated when the connection is lost.
     * Note the documentation about the `isSynced` property.
     */
    whenSynced: Promise<void>
    
    /**
     * If this document is a subdocument - a document integrated into another document - then _item is defined.
     */
    _item: Item | null
    
    _transaction: Transaction | null
    _transactionCleanups: Transaction[]
    

    /**
     * @param {DocOpts} opts configuration
     */
    constructor ({ guid = random.uuidv4(), collectionid = null, gc = true, gcFilter = () => true, meta = null, autoLoad = false, shouldLoad = true }: DocOpts = {}) {
        super()
        this.gc = gc
        this.gcFilter = gcFilter
        this.clientID = generateNewClientID()
        this.guid = guid
        this.collectionid = collectionid
        this.share = new Map()
        this.store = new StructStore()
        this._transaction = null
        this._transactionCleanups = []
        this.subdocs = new Set()
        this._item = null
        this.shouldLoad = shouldLoad
        this.autoLoad = autoLoad
        this.meta = meta
        this.isLoaded = false
        this.isSynced = false
        this.whenLoaded = promise.create(resolve => {
            this.on('load', () => {
                this.isLoaded = true
                resolve(this)
            })
        })
        const provideSyncedPromise = () => new Promise<void>(resolve => {
            const eventHandler = (isSynced: boolean | undefined) => {
                if (isSynced === undefined || isSynced === true) {
                    this.off('sync', eventHandler)
                    resolve()
                }
            }
            this.on('sync', eventHandler)
        })
        this.on('sync', (isSynced: boolean | undefined) => {
            if (isSynced === false && this.isSynced) {
                this.whenSynced = provideSyncedPromise()
            }
            this.isSynced = isSynced === undefined || isSynced === true
            if (!this.isLoaded) {
                this.emit('load', [])
            }
        })
        this.whenSynced = provideSyncedPromise()
    }

    /**
     * Notify the parent document that you request to load data into this subdocument (if it is a subdocument).
     *
     * `load()` might be used in the future to request any provider to load the most current data.
     *
     * It is safe to call `load()` multiple times.
     */
    load() {
        const item = this._item
        if (item !== null && !this.shouldLoad) {
            (item.parent as AbstractType_<any>).doc?.transact(transaction => {
                transaction.subdocsLoaded.add(this)
            }, null)
        }
        this.shouldLoad = true
    }

    getSubdocs() { return this.subdocs }

    getSubdocGuids() { return new Set(Array.from(this.subdocs).map(doc => doc.guid)) }

    /**
     * Changes that happen inside of a transaction are bundled. This means that
     * the observer fires _after_ the transaction is finished and that all changes
     * that happened inside of the transaction are sent as one message to the
     * other peers.
     *
     * @param {function(Transaction):void} f The function that should be executed as a transaction
     * @param {any} [origin] Origin of who started the transaction. Will be stored on transaction.origin
     */
    transact(f: (transaction: Transaction) => void, origin: any = null, local: boolean = true) { 
        Transaction.transact(this, f, origin, local)
    }

    /**
     * Define a shared data type.
     *
     * Multiple calls of `y.get(name, TypeConstructor)` yield the same result
     * and do not overwrite each other. I.e.
     * `y.define(name, Y.Array) === y.define(name, Y.Array)`
     *
     * After this method is called, the type is also available on `y.share.get(name)`.
     *
     * *Best Practices:*
     * Define all types right after the Yjs instance is created and store them in a separate object.
     * Also use the typed methods `getText(name)`, `getArray(name)`, ..
     *
     * @example
     *     const y = new Y(..)
     *     const appState = {
     *         document: y.getText('document')
     *         comments: y.getArray('comments')
     *     }
     *
     * @param {string} name
     * @param {Function} TypeConstructor The constructor of the type definition. E.g. Y.Text, Y.Array, Y.Map, ...
     * @return {AbstractType_<any>} The created type. Constructed with TypeConstructor
     */
    get<T extends AbstractType_<any>>(name: string, TypeConstructor: any = AbstractType_): T {
        const type = map.setIfUndefined(this.share, name, () => {
            const t = new TypeConstructor()
            t._integrate(this, null)
            return t
        })
        const Constr = type.constructor
        if (TypeConstructor !== AbstractType_ && Constr !== TypeConstructor) {
            if (Constr === AbstractType_) {
                const t = new TypeConstructor()
                t._map = type._map
                type._map.forEach((n: Item | null) => {
                    for (; n !== null; n = n.left) {
                        n.parent = t
                    }
                })
                t._start = type._start
                for (let n = t._start; n !== null; n = n.right) {
                    n.parent = t
                }
                t._length = type._length
                this.share.set(name, t)
                t._integrate(this, null)
                return t
            } else {
                throw new Error(`Type with the name ${name} has already been defined with a different constructor`)
            }
        }
        return type
    }

    getMap<T extends Contentable_>(name: string = ''): YMap<T> { return this.get(name, YMap) }

    getArray<T extends Contentable_>(name: string = ''): YArray<T> { return this.get(name, YArray) }

    getXmlFragment (name: string = ''): YXmlFragment { return this.get(name, YXmlFragment) }

    getText (name: string = ''): YText { return this.get(name, YText) }

    /**
     * Converts the entire document into a js object, recursively traversing each yjs type
     * Doesn't log types that have not been defined (using ydoc.getType(..)).
     *
     * @deprecated Do not use this method and rather call toJSON directly on the shared types.
     */
    toJSON(): { [s: string]: any } {
        const doc: { [s: string]: any } = {}
        this.share.forEach((value, key) => { doc[key] = value.toJSON() })
        return doc
    }

    /** Emit `destroy` event and unregister all event handlers. */
    destroy() {
        array.from(this.subdocs).forEach(subdoc => subdoc.destroy())
        const item = this._item
        if (item !== null) {
            this._item = null
            const content = item.content as ContentDoc
            content.doc = new Doc({ guid: this.guid, ...content.opts, shouldLoad: false })
            content.doc._item = item;
            (item.parent as AbstractType_<any>).doc?.transact(transaction => {
                const doc = content.doc
                if (!item.deleted) { transaction.subdocsAdded.add(doc) }
                transaction.subdocsRemoved.add(this)
            }, null)
        }
        this.emit('destroyed', [true])
        this.emit('destroy', [this])
        super.destroy()
    }
}
