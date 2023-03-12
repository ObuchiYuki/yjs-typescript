
import {
    Doc, Transaction, EventHandler, YEvent, Item, UpdateEncoderAny, ArraySearchMarker
} from '../internals'

export interface AbstractType_<EventType> {
    doc: Doc|null

    _item: Item|null
    _map: Map<string, Item>
    _start: Item|null
    _length: number
    /** Event handlers */
    _eH: EventHandler<EventType,Transaction>
    /** Deep event handlers */
    _dEH: EventHandler<Array<YEvent<any>>, Transaction>
    _searchMarker: null | Array<ArraySearchMarker>

    get parent(): AbstractType_<any> | null

    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y: Doc, item: Item|null): void

    _copy(): AbstractType_<EventType>

    clone(): AbstractType_<EventType>

    _write(encoder: UpdateEncoderAny): void

    /** The first non-deleted item */
    get _first(): Item | null

    /**
     * Creates YEvent and calls all type observers.
     * Must be implemented by each type.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, _parentSubs: Set<null|string>): void

    /** Observe all events that are created on this type. */
    observe(f: (type: EventType, transaction: Transaction) => void): void

    /** Observe all events that are created by this type and its children. */
    observeDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void): void

    /** Unregister an observer function. */
    unobserve(f: (type: EventType, transaction: Transaction) => void): void

    /** Unregister an observer function. */
    unobserveDeep(f: (events: Array<YEvent<any>>, transaction: Transaction) => void): void

    toJSON(): any 
}