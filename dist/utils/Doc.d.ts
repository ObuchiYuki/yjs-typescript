/**
 * @module Y
 */
import { StructStore, AbstractType_, YArray, YText, YMap, YXmlFragment, Item, Transaction, YEvent, // eslint-disable-line
Contentable_ } from '../internals';
import { Observable } from 'lib0/observable';
import * as random from 'lib0/random';
export declare const generateNewClientId: typeof random.uint32;
/**
 * @typedef {Object} DocOpts
 * @property {boolean} [DocOpts.gc=true] Disable garbage collection (default: gc=true)
 * @property {function(Item):boolean} [DocOpts.gcFilter] Will be called before an Item is garbage collected. Return false to keep the Item.
 * @property {string} [DocOpts.guid] Define a globally unique identifier for this document
 * @property {string | null} [DocOpts.collectionid] Associate this document with a collection. This only plays a role if your provider has a concept of collection.
 * @property {any} [DocOpts.meta] Any kind of meta information you want to associate with this document. If this is a subdocument, remote peers will store the meta information as well.
 * @property {boolean} [DocOpts.autoLoad] If a subdocument, automatically load document. If this is a subdocument, remote peers will load the document as well automatically.
 * @property {boolean} [DocOpts.shouldLoad] Whether the document should be synced by the provider now. This is toggled to true when you call ydoc.load()
 */
export type DocOpts = {
    gc?: boolean;
    gcFilter?: (item: Item) => boolean;
    guid?: string;
    collectionid?: string | null;
    meta?: any;
    autoLoad?: boolean;
    shouldLoad?: boolean;
};
/**
 * A Yjs instance handles the state of shared data.
 * @extends Observable<string>
 */
export declare class Doc extends Observable<string> {
    gcFilter: (arg0: Item) => boolean;
    gc: boolean;
    clientID: number;
    guid: string;
    collectionid: string | null;
    share: Map<string, AbstractType_<YEvent<any>>>;
    store: StructStore;
    _transaction: Transaction | null;
    _transactionCleanups: Transaction[];
    subdocs: Set<Doc>;
    _item: Item | null;
    shouldLoad: boolean;
    autoLoad: boolean;
    meta: any;
    isLoaded: boolean;
    isSynced: boolean;
    whenLoaded: Promise<Doc>;
    whenSynced: Promise<void>;
    /**
     * @param {DocOpts} opts configuration
     */
    constructor({ guid, collectionid, gc, gcFilter, meta, autoLoad, shouldLoad }?: DocOpts);
    /**
     * Notify the parent document that you request to load data into this subdocument (if it is a subdocument).
     *
     * `load()` might be used in the future to request any provider to load the most current data.
     *
     * It is safe to call `load()` multiple times.
     */
    load(): void;
    getSubdocs(): Set<Doc>;
    getSubdocGuids(): Set<string>;
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
    transact(f: (arg0: Transaction) => void, origin?: any): void;
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
    get(name: string, TypeConstructor?: Function): AbstractType_<any>;
    /**
     * @template T
     * @param {string} [name]
     * @return {YArray<T>}
     *
     * @public
     */
    getArray<T extends Contentable_>(name?: string): YArray<T>;
    /**
     * @param {string} [name]
     * @return {YText}
     *
     * @public
     */
    getText(name?: string): YText;
    /**
     * @template T
     * @param {string} [name]
     * @return {YMap<T>}
     *
     * @public
     */
    getMap<T extends Contentable_>(name?: string): YMap<T>;
    /**
     * @param {string} [name]
     * @return {YXmlFragment}
     *
     * @public
     */
    getXmlFragment(name?: string): YXmlFragment;
    /**
     * Converts the entire document into a js object, recursively traversing each yjs type
     * Doesn't log types that have not been defined (using ydoc.getType(..)).
     *
     * @deprecated Do not use this method and rather call toJSON directly on the shared types.
     *
     * @return {Object<string, any>}
     */
    toJSON(): {
        [s: string]: any;
    };
    /**
     * Emit `destroy` event and unregister all event handlers.
     */
    destroy(): void;
    /**
     * @param {string} eventName
     * @param {function(...any):any} f
     */
    on(eventName: string, f: Function): void;
    /**
     * @param {string} eventName
     * @param {function} f
     */
    off(eventName: string, f: Function): void;
}
