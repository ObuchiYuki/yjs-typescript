
import {
    Doc, Transaction, EventHandler, YEvent, Item, 
    createEventHandler, addEventHandlerListener, removeEventHandlerListener,
    UpdateEncoderAny_, ArraySearchMarker, 
} from '../internals'

export abstract class AbstractType_<EventType> {
    doc: Doc|null = null

    _item: Item|null = null
    _map: Map<string, Item> = new Map()
    _start: Item|null = null
    _length: number = 0
    /** Event handlers */
    _eH: EventHandler<EventType,Transaction> = createEventHandler()
    /** Deep event handlers */
    _dEH: EventHandler<Array<YEvent<any>>,Transaction> = createEventHandler()
    _searchMarker: null | Array<ArraySearchMarker> = null

    constructor () {}

    get parent(): AbstractType_<any>|null {
        return this._item ? (this._item.parent as AbstractType_<any>) : null
    }

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

    abstract _copy(): AbstractType_<EventType>

    abstract clone(): AbstractType_<EventType>

    _write (_encoder: UpdateEncoderAny_) {}

    /** The first non-deleted item */
    get _first() {
        let n = this._start
        while (n !== null && n.deleted) { n = n.right }
        return n
    }

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
        addEventHandlerListener(this._eH, f)
    }

    /** Observe all events that are created by this type and its children. */
    observeDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void) {
        addEventHandlerListener(this._dEH, f)
    }

    /** Unregister an observer function. */
    unobserve(f: (type: EventType, transaction: Transaction) => void) {
        removeEventHandlerListener(this._eH, f)
    }

    /** Unregister an observer function. */
    unobserveDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void) {
        removeEventHandlerListener(this._dEH, f)
    }

    toJSON(): any {}
}