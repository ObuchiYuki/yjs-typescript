/**
 * @module Y
 */
import { StructStore, AbstractType_, YArray, YText, YMap, YXmlFragment, Item, Transaction, YEvent, // eslint-disable-line
Contentable_ } from '../internals';
import * as lib0 from 'lib0-typescript';
export type DocOpts = {
    gc?: boolean;
    gcFilter?: (item: Item) => boolean;
    guid?: string;
    collectionid?: string | null;
    meta?: any;
    autoLoad?: boolean;
    shouldLoad?: boolean;
    clientID?: number;
};
export type DocMessageType = {
    "load": [];
    "sync": [boolean, Doc];
    "destroy": [Doc];
    "destroyed": [boolean];
    "update": [Uint8Array, any, Doc, Transaction];
    "updateV2": [Uint8Array, any, Doc, Transaction];
    "beforeObserverCalls": [Transaction, Doc];
    "beforeTransaction": [Transaction, Doc];
    "afterTransaction": [Transaction, Doc];
    "afterTransactionCleanup": [Transaction, Doc];
    "beforeAllTransactions": [Doc];
    "afterAllTransactions": [Doc, Transaction[]];
    "subdocs": [{
        loaded: Set<Doc>;
        added: Set<Doc>;
        removed: Set<Doc>;
    }, Doc, Transaction];
};
/**
 * A Yjs instance handles the state of shared data.
 * @extends Observable<string>
 */
export declare class Doc extends lib0.Observable<DocMessageType> {
    gcFilter: (arg0: Item) => boolean;
    gc: boolean;
    clientID: number;
    guid: string;
    collectionid: string | null;
    share: Map<string, AbstractType_<YEvent<any>>>;
    store: StructStore;
    subdocs: Set<Doc>;
    shouldLoad: boolean;
    autoLoad: boolean;
    meta: any;
    /**
     * This is set to true when the persistence provider loaded the document from the database or when the `sync` event fires.
     * Note that not all providers implement this feature. Provider authors are encouraged to fire the `load` event when the doc content is loaded from the database.
     */
    isLoaded: boolean;
    /**
     * This is set to true when the connection provider has successfully synced with a backend.
     * Note that when using peer-to-peer providers this event may not provide very useful.
     * Also note that not all providers implement this feature. Provider authors are encouraged to fire
     * the `sync` event when the doc has been synced (with `true` as a parameter) or if connection is
     * lost (with false as a parameter).
     */
    isSynced: boolean;
    /**
     * Promise that resolves once the document has been loaded from a presistence provider.
     */
    whenLoaded: Promise<Doc>;
    /**
     * Promise that resolves once the document has been synced with a backend.
     * This promise is recreated when the connection is lost.
     * Note the documentation about the `isSynced` property.
     */
    whenSynced: Promise<void>;
    /**
     * If this document is a subdocument - a document integrated into another document - then _item is defined.
     */
    _item: Item | null;
    _transaction: Transaction | null;
    _transactionCleanups: Transaction[];
    /**
     * @param {DocOpts} opts configuration
     */
    constructor({ guid, collectionid, gc, gcFilter, meta, autoLoad, shouldLoad, clientID }?: DocOpts);
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
     */
    transact(f: (transaction: Transaction) => void, origin?: any, local?: boolean): void;
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
    get<T extends AbstractType_<any>>(name: string, TypeConstructor?: any): T;
    getMap<T extends Contentable_>(name?: string): YMap<T>;
    getArray<T extends Contentable_>(name?: string): YArray<T>;
    getXmlFragment(name?: string): YXmlFragment;
    getText(name?: string): YText;
    /**
     * Converts the entire document into a js object, recursively traversing each yjs type
     * Doesn't log types that have not been defined (using ydoc.getType(..)).
     *
     * @deprecated Do not use this method and rather call toJSON directly on the shared types.
     */
    toJSON(): {
        [s: string]: any;
    };
    /** Emit `destroy` event and unregister all event handlers. */
    destroy(): void;
}
