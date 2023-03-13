"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractType_ = void 0;
const internals_1 = require("../internals");
class AbstractType_ {
    constructor() {
        this.doc = null;
        this._item = null;
        this._map = new Map();
        this._start = null;
        this._length = 0;
        /** Event handlers */
        this._eH = (0, internals_1.createEventHandler)();
        /** Deep event handlers */
        this._dEH = (0, internals_1.createEventHandler)();
        this._searchMarker = null;
    }
    get parent() {
        return this._item ? this._item.parent : null;
    }
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     */
    _integrate(y, item) {
        this.doc = y;
        this._item = item;
    }
    _write(_encoder) { }
    /** The first non-deleted item */
    get _first() {
        let n = this._start;
        while (n !== null && n.deleted) {
            n = n.right;
        }
        return n;
    }
    /**
     * Creates YEvent and calls all type observers.
     * Must be implemented by each type.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction, _parentSubs) {
        if (!transaction.local && this._searchMarker) {
            this._searchMarker.length = 0;
        }
    }
    /** Observe all events that are created on this type. */
    observe(f) {
        (0, internals_1.addEventHandlerListener)(this._eH, f);
    }
    /** Observe all events that are created by this type and its children. */
    observeDeep(f) {
        (0, internals_1.addEventHandlerListener)(this._dEH, f);
    }
    /** Unregister an observer function. */
    unobserve(f) {
        (0, internals_1.removeEventHandlerListener)(this._eH, f);
    }
    /** Unregister an observer function. */
    unobserveDeep(f) {
        (0, internals_1.removeEventHandlerListener)(this._dEH, f);
    }
    toJSON() { }
}
exports.AbstractType_ = AbstractType_;
