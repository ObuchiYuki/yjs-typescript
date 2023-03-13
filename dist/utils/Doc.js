"use strict";
/**
 * @module Y
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Doc = exports.generateNewClientId = void 0;
const internals_1 = require("../internals");
const observable_1 = require("lib0/observable");
const random = require("lib0/random");
const map = require("lib0/map");
const array = require("lib0/array");
const promise = require("lib0/promise");
exports.generateNewClientId = random.uint32;
/**
 * A Yjs instance handles the state of shared data.
 * @extends Observable<string>
 */
class Doc extends observable_1.Observable {
    /**
     * @param {DocOpts} opts configuration
     */
    constructor({ guid = random.uuidv4(), collectionid = null, gc = true, gcFilter = () => true, meta = null, autoLoad = false, shouldLoad = true } = {}) {
        super();
        this.gc = gc;
        this.gcFilter = gcFilter;
        this.clientID = (0, exports.generateNewClientId)();
        this.guid = guid;
        this.collectionid = collectionid;
        /**
         * @type {Map<string, AbstractType_<YEvent<any>>>}
         */
        this.share = new Map();
        this.store = new internals_1.StructStore();
        /**
         * @type {Transaction | null}
         */
        this._transaction = null;
        /**
         * @type {Array<Transaction>}
         */
        this._transactionCleanups = [];
        /**
         * @type {Set<Doc>}
         */
        this.subdocs = new Set();
        /**
         * If this document is a subdocument - a document integrated into another document - then _item is defined.
         * @type {Item?}
         */
        this._item = null;
        this.shouldLoad = shouldLoad;
        this.autoLoad = autoLoad;
        this.meta = meta;
        /**
         * This is set to true when the persistence provider loaded the document from the database or when the `sync` event fires.
         * Note that not all providers implement this feature. Provider authors are encouraged to fire the `load` event when the doc content is loaded from the database.
         *
         * @type {boolean}
         */
        this.isLoaded = false;
        /**
         * This is set to true when the connection provider has successfully synced with a backend.
         * Note that when using peer-to-peer providers this event may not provide very useful.
         * Also note that not all providers implement this feature. Provider authors are encouraged to fire
         * the `sync` event when the doc has been synced (with `true` as a parameter) or if connection is
         * lost (with false as a parameter).
         */
        this.isSynced = false;
        /**
         * Promise that resolves once the document has been loaded from a presistence provider.
         */
        this.whenLoaded = promise.create(resolve => {
            this.on('load', () => {
                this.isLoaded = true;
                resolve(this);
            });
        });
        const provideSyncedPromise = () => new Promise(resolve => {
            /**
             * @param {boolean} isSynced
             */
            const eventHandler = (isSynced) => {
                if (isSynced === undefined || isSynced === true) {
                    this.off('sync', eventHandler);
                    resolve();
                }
            };
            this.on('sync', eventHandler);
        });
        this.on('sync', (isSynced) => {
            if (isSynced === false && this.isSynced) {
                this.whenSynced = provideSyncedPromise();
            }
            this.isSynced = isSynced === undefined || isSynced === true;
            if (!this.isLoaded) {
                this.emit('load', []);
            }
        });
        /**
         * Promise that resolves once the document has been synced with a backend.
         * This promise is recreated when the connection is lost.
         * Note the documentation about the `isSynced` property.
         */
        this.whenSynced = provideSyncedPromise();
    }
    /**
     * Notify the parent document that you request to load data into this subdocument (if it is a subdocument).
     *
     * `load()` might be used in the future to request any provider to load the most current data.
     *
     * It is safe to call `load()` multiple times.
     */
    load() {
        const item = this._item;
        if (item !== null && !this.shouldLoad) {
            (0, internals_1.transact)(item.parent.doc, transaction => {
                transaction.subdocsLoaded.add(this);
            }, null, true);
        }
        this.shouldLoad = true;
    }
    getSubdocs() {
        return this.subdocs;
    }
    getSubdocGuids() {
        return new Set(array.from(this.subdocs).map(doc => doc.guid));
    }
    /**
     * Changes that happen inside of a transaction are bundled. This means that
     * the observer fires _after_ the transaction is finished and that all changes
     * that happened inside of the transaction are sent as one message to the
     * other peers.
     *
     * @param {function(Transaction):void} f The function that should be executed as a transaction
     * @param {any} [origin] Origin of who started the transaction. Will be stored on transaction.origin
     *
     * @public
     */
    transact(f, origin = null) {
        (0, internals_1.transact)(this, f, origin);
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
     *
     * @public
     */
    get(name, TypeConstructor = internals_1.AbstractType_) {
        const type = map.setIfUndefined(this.share, name, () => {
            // @ts-ignore
            const t = new TypeConstructor();
            t._integrate(this, null);
            return t;
        });
        const Constr = type.constructor;
        if (TypeConstructor !== internals_1.AbstractType_ && Constr !== TypeConstructor) {
            if (Constr === internals_1.AbstractType_) {
                // @ts-ignore
                const t = new TypeConstructor();
                t._map = type._map;
                type._map.forEach(/** @param {Item?} n */ (n) => {
                    for (; n !== null; n = n.left) {
                        // @ts-ignore
                        n.parent = t;
                    }
                });
                t._start = type._start;
                for (let n = t._start; n !== null; n = n.right) {
                    n.parent = t;
                }
                t._length = type._length;
                this.share.set(name, t);
                t._integrate(this, null);
                return t;
            }
            else {
                throw new Error(`Type with the name ${name} has already been defined with a different constructor`);
            }
        }
        return type;
    }
    /**
     * @template T
     * @param {string} [name]
     * @return {YArray<T>}
     *
     * @public
     */
    getArray(name = '') {
        // @ts-ignore
        return this.get(name, internals_1.YArray);
    }
    /**
     * @param {string} [name]
     * @return {YText}
     *
     * @public
     */
    getText(name = '') {
        // @ts-ignore
        return this.get(name, internals_1.YText);
    }
    /**
     * @template T
     * @param {string} [name]
     * @return {YMap<T>}
     *
     * @public
     */
    getMap(name = '') {
        // @ts-ignore
        return this.get(name, internals_1.YMap);
    }
    /**
     * @param {string} [name]
     * @return {YXmlFragment}
     *
     * @public
     */
    getXmlFragment(name = '') {
        // @ts-ignore
        return this.get(name, internals_1.YXmlFragment);
    }
    /**
     * Converts the entire document into a js object, recursively traversing each yjs type
     * Doesn't log types that have not been defined (using ydoc.getType(..)).
     *
     * @deprecated Do not use this method and rather call toJSON directly on the shared types.
     *
     * @return {Object<string, any>}
     */
    toJSON() {
        /**
         * @type {Object<string, any>}
         */
        const doc = {};
        this.share.forEach((value, key) => {
            doc[key] = value.toJSON();
        });
        return doc;
    }
    /**
     * Emit `destroy` event and unregister all event handlers.
     */
    destroy() {
        array.from(this.subdocs).forEach(subdoc => subdoc.destroy());
        const item = this._item;
        if (item !== null) {
            this._item = null;
            const content = item.content;
            content.doc = new Doc(Object.assign(Object.assign({ guid: this.guid }, content.opts), { shouldLoad: false }));
            content.doc._item = item;
            (0, internals_1.transact)(item.parent.doc, transaction => {
                const doc = content.doc;
                if (!item.deleted) {
                    transaction.subdocsAdded.add(doc);
                }
                transaction.subdocsRemoved.add(this);
            }, null, true);
        }
        this.emit('destroyed', [true]);
        this.emit('destroy', [this]);
        super.destroy();
    }
    /**
     * @param {string} eventName
     * @param {function(...any):any} f
     */
    on(eventName, f) {
        super.on(eventName, f);
    }
    /**
     * @param {string} eventName
     * @param {function} f
     */
    off(eventName, f) {
        super.off(eventName, f);
    }
}
exports.Doc = Doc;
