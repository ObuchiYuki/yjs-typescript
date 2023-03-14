"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYText = exports.YText = exports.YTextEvent = exports.cleanupYTextFormatting = exports.ItemTextListPosition = void 0;
const AbstractType_1 = require("./AbstractType_");
const internals_1 = require("../internals");
const map = require("lib0/map");
const error = require("lib0/error");
class ItemTextListPosition {
    constructor(left, right, index, currentAttributes) {
        this.left = left;
        this.right = right;
        this.index = index;
        this.currentAttributes = currentAttributes;
    }
    /** Only call this if you know that this.right is defined */
    forward() {
        if (this.right === null) {
            error.unexpectedCase();
        }
        if (this.right.content.constructor === internals_1.ContentFormat) {
            if (!this.right.deleted) {
                updateCurrentAttributes(this.currentAttributes, this.right.content);
            }
        }
        else {
            if (!this.right.deleted) {
                this.index += this.right.length;
            }
        }
        this.left = this.right;
        this.right = this.right.right;
    }
    /**
     * @param {Transaction} transaction
     * @param {ItemTextListPosition} pos
     * @param {number} count steps to move forward
     * @return {ItemTextListPosition}
     *
     * @private
     * @function
     */
    findNext(transaction, count) {
        while (this.right !== null && count > 0) {
            if (this.right.content.constructor === internals_1.ContentFormat) {
                if (!this.right.deleted) {
                    updateCurrentAttributes(this.currentAttributes, this.right.content);
                }
            }
            else {
                if (!this.right.deleted) {
                    if (count < this.right.length) {
                        // split right
                        internals_1.StructStore.getItemCleanStart(transaction, new internals_1.ID(this.right.id.client, this.right.id.clock + count));
                    }
                    this.index += this.right.length;
                    count -= this.right.length;
                }
            }
            this.left = this.right;
            this.right = this.right.right;
            // pos.forward() - we don't forward because that would halve the performance because we already do the checks above
        }
        return this;
    }
    static find(transaction, parent, index) {
        const currentAttributes = new Map();
        const marker = internals_1.ArraySearchMarker_.find(parent, index);
        if (marker && marker.item) {
            const pos = new ItemTextListPosition(marker.item.left, marker.item, marker.index, currentAttributes);
            return pos.findNext(transaction, index - marker.index);
        }
        else {
            const pos = new ItemTextListPosition(null, parent._start, 0, currentAttributes);
            return pos.findNext(transaction, index);
        }
    }
}
exports.ItemTextListPosition = ItemTextListPosition;
/** Negate applied formats */
const insertNegatedAttributes = (transaction, parent, currPos, negatedAttributes) => {
    // check if we really need to remove attributes
    while (currPos.right !== null && (currPos.right.deleted === true || (currPos.right.content.constructor === internals_1.ContentFormat &&
        (0, internals_1.equalAttributes_)(negatedAttributes.get(currPos.right.content.key), currPos.right.content.value)))) {
        if (!currPos.right.deleted) {
            negatedAttributes.delete(currPos.right.content.key);
        }
        currPos.forward();
    }
    const doc = transaction.doc;
    const ownClientId = doc.clientID;
    negatedAttributes.forEach((val, key) => {
        const left = currPos.left;
        const right = currPos.right;
        const nextFormat = new internals_1.Item(new internals_1.ID(ownClientId, doc.store.getState(ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new internals_1.ContentFormat(key, val));
        nextFormat.integrate(transaction, 0);
        currPos.right = nextFormat;
        currPos.forward();
    });
};
const updateCurrentAttributes = (currentAttributes, format) => {
    const { key, value } = format;
    if (value === null) {
        currentAttributes.delete(key);
    }
    else {
        currentAttributes.set(key, value);
    }
};
const minimizeAttributeChanges = (currPos, attributes) => {
    // go right while attributes[right.key] === right.value (or right is deleted)
    while (true) {
        if (currPos.right === null) {
            break;
        }
        else if (currPos.right.deleted || (currPos.right.content.constructor === internals_1.ContentFormat && (0, internals_1.equalAttributes_)(attributes[currPos.right.content.key] || null, currPos.right.content.value))) {
            //
        }
        else {
            break;
        }
        currPos.forward();
    }
};
const insertAttributes = (transaction, parent, currPos, attributes) => {
    const doc = transaction.doc;
    const ownClientId = doc.clientID;
    const negatedAttributes = new Map();
    // insert format-start items
    for (const key in attributes) {
        const val = attributes[key];
        const currentVal = currPos.currentAttributes.get(key) || null;
        if (!(0, internals_1.equalAttributes_)(currentVal, val)) {
            // save negated attribute (set null if currentVal undefined)
            negatedAttributes.set(key, currentVal);
            const { left, right } = currPos;
            currPos.right = new internals_1.Item(new internals_1.ID(ownClientId, doc.store.getState(ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, new internals_1.ContentFormat(key, val));
            currPos.right.integrate(transaction, 0);
            currPos.forward();
        }
    }
    return negatedAttributes;
};
const insertText = (transaction, parent, currPos, text, attributes) => {
    currPos.currentAttributes.forEach((_val, key) => {
        if (attributes[key] === undefined) {
            attributes[key] = null;
        }
    });
    const doc = transaction.doc;
    const ownClientId = doc.clientID;
    minimizeAttributeChanges(currPos, attributes);
    const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes);
    // insert content
    const content = text.constructor === String ? new internals_1.ContentString(text) : (text instanceof AbstractType_1.AbstractType_ ? new internals_1.ContentType(text) : new internals_1.ContentEmbed(text));
    let { left, right, index } = currPos;
    if (parent._searchMarker) {
        internals_1.ArraySearchMarker_.updateChanges(parent._searchMarker, currPos.index, content.getLength());
    }
    right = new internals_1.Item(new internals_1.ID(ownClientId, doc.store.getState(ownClientId)), left, left && left.lastID, right, right && right.id, parent, null, content);
    right.integrate(transaction, 0);
    currPos.right = right;
    currPos.index = index;
    currPos.forward();
    insertNegatedAttributes(transaction, parent, currPos, negatedAttributes);
};
const formatText = (transaction, parent, currPos, length, attributes) => {
    const doc = transaction.doc;
    const ownClientId = doc.clientID;
    minimizeAttributeChanges(currPos, attributes);
    const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes);
    // iterate until first non-format or null is found
    // delete all formats with attributes[format.key] != null
    // also check the attributes after the first non-format as we do not want to insert redundant negated attributes there
    // eslint-disable-next-line no-labels
    iterationLoop: while (currPos.right !== null &&
        (length > 0 ||
            (negatedAttributes.size > 0 &&
                (currPos.right.deleted || currPos.right.content.constructor === internals_1.ContentFormat)))) {
        if (!currPos.right.deleted) {
            switch (currPos.right.content.constructor) {
                case internals_1.ContentFormat: {
                    const { key, value } = currPos.right.content;
                    const attr = attributes[key];
                    if (attr !== undefined) {
                        if ((0, internals_1.equalAttributes_)(attr, value)) {
                            negatedAttributes.delete(key);
                        }
                        else {
                            if (length === 0) {
                                // no need to further extend negatedAttributes
                                // eslint-disable-next-line no-labels
                                break iterationLoop;
                            }
                            negatedAttributes.set(key, value);
                        }
                        currPos.right.delete(transaction);
                    }
                    else {
                        currPos.currentAttributes.set(key, value);
                    }
                    break;
                }
                default:
                    if (length < currPos.right.length) {
                        internals_1.StructStore.getItemCleanStart(transaction, new internals_1.ID(currPos.right.id.client, currPos.right.id.clock + length));
                    }
                    length -= currPos.right.length;
                    break;
            }
        }
        currPos.forward();
    }
    // Quill just assumes that the editor starts with a newline and that it always
    // ends with a newline. We only insert that newline when a new newline is
    // inserted - i.e when length is bigger than type.length
    if (length > 0) {
        let newlines = '';
        for (; length > 0; length--) {
            newlines += '\n';
        }
        currPos.right = new internals_1.Item(new internals_1.ID(ownClientId, doc.store.getState(ownClientId)), currPos.left, currPos.left && currPos.left.lastID, currPos.right, currPos.right && currPos.right.id, parent, null, new internals_1.ContentString(newlines));
        currPos.right.integrate(transaction, 0);
        currPos.forward();
    }
    insertNegatedAttributes(transaction, parent, currPos, negatedAttributes);
};
/**
 * Call this function after string content has been deleted in order to
 * clean up formatting Items.
 *
 * @param {Transaction} transaction
 * @param {Item} start
 * @param {Item|null} curr exclusive end, automatically iterates to the next Content Item
 * @param {Map<string,any>} startAttributes
 * @param {Map<string,any>} currAttributes
 * @return {number} The amount of formatting Items deleted.
 *
 * @function
 */
const cleanupFormattingGap = (transaction, start, curr, startAttributes, currAttributes) => {
    let end = start;
    const endFormats = map.create();
    while (end && (!end.countable || end.deleted)) {
        if (!end.deleted && end.content.constructor === internals_1.ContentFormat) {
            const cf = end.content;
            endFormats.set(cf.key, cf);
        }
        end = end.right;
    }
    let cleanups = 0;
    let reachedCurr = false;
    while (start !== end) {
        if (curr === start) {
            reachedCurr = true;
        }
        if (!start.deleted) {
            const content = start.content;
            switch (content.constructor) {
                case internals_1.ContentFormat: {
                    const { key, value } = content;
                    const startAttrValue = startAttributes.get(key) || null;
                    if (endFormats.get(key) !== content || startAttrValue === value) {
                        // Either this format is overwritten or it is not necessary because the attribute already existed.
                        start.delete(transaction);
                        cleanups++;
                        if (!reachedCurr && (currAttributes.get(key) || null) === value && startAttrValue !== value) {
                            if (startAttrValue === null) {
                                currAttributes.delete(key);
                            }
                            else {
                                currAttributes.set(key, startAttrValue);
                            }
                        }
                    }
                    if (!reachedCurr && !start.deleted) {
                        updateCurrentAttributes(currAttributes, content);
                    }
                    break;
                }
            }
        }
        start = start.right;
    }
    return cleanups;
};
const cleanupContextlessFormattingGap = (transaction, item) => {
    // iterate until item.right is null or content
    while (item && item.right && (item.right.deleted || !item.right.countable)) {
        item = item.right;
    }
    const attrs = new Set();
    // iterate back until a content item is found
    while (item && (item.deleted || !item.countable)) {
        if (!item.deleted && item.content.constructor === internals_1.ContentFormat) {
            const key = item.content.key;
            if (attrs.has(key)) {
                item.delete(transaction);
            }
            else {
                attrs.add(key);
            }
        }
        item = item.left;
    }
};
/**
 * This function is experimental and subject to change / be removed.
 *
 * Ideally, we don't need this function at all. Formatting attributes should be cleaned up
 * automatically after each change. This function iterates twice over the complete YText type
 * and removes unnecessary formatting attributes. This is also helpful for testing.
 *
 * This function won't be exported anymore as soon as there is confidence that the YText type works as intended.
 *
 * @param {YText} type
 * @return {number} How many formatting attributes have been cleaned up.
 */
const cleanupYTextFormatting = (type) => {
    var _a;
    let res = 0;
    (_a = type.doc) === null || _a === void 0 ? void 0 : _a.transact(transaction => {
        let start = type._start;
        let end = type._start;
        let startAttributes = map.create();
        const currentAttributes = map.copy(startAttributes);
        while (end) {
            if (end.deleted === false) {
                switch (end.content.constructor) {
                    case internals_1.ContentFormat:
                        updateCurrentAttributes(currentAttributes, end.content);
                        break;
                    default:
                        res += cleanupFormattingGap(transaction, start, end, startAttributes, currentAttributes);
                        startAttributes = map.copy(currentAttributes);
                        start = end;
                        break;
                }
            }
            end = end.right;
        }
    });
    return res;
};
exports.cleanupYTextFormatting = cleanupYTextFormatting;
const deleteText = (transaction, currPos, length) => {
    const startLength = length;
    const startAttrs = map.copy(currPos.currentAttributes);
    const start = currPos.right;
    while (length > 0 && currPos.right !== null) {
        if (currPos.right.deleted === false) {
            switch (currPos.right.content.constructor) {
                case internals_1.ContentType:
                case internals_1.ContentEmbed:
                case internals_1.ContentString:
                    if (length < currPos.right.length) {
                        internals_1.StructStore.getItemCleanStart(transaction, new internals_1.ID(currPos.right.id.client, currPos.right.id.clock + length));
                    }
                    length -= currPos.right.length;
                    currPos.right.delete(transaction);
                    break;
            }
        }
        currPos.forward();
    }
    if (start) {
        cleanupFormattingGap(transaction, start, currPos.right, startAttrs, currPos.currentAttributes);
    }
    const parent = (currPos.left || currPos.right).parent;
    if (parent._searchMarker) {
        internals_1.ArraySearchMarker_.updateChanges(parent._searchMarker, currPos.index, -startLength + length);
    }
    return currPos;
};
/** Event that describes the changes on a YText type. */
class YTextEvent extends internals_1.YEvent {
    /**
     * @param {YText} ytext
     * @param {Transaction} transaction
     * @param {Set<string>} keysChanged The keys that changed
     */
    constructor(ytext, transaction, subs) {
        super(ytext, transaction);
        this.childListChanged = false;
        this.keysChanged = new Set();
        subs.forEach((sub) => {
            if (sub === null) {
                this.childListChanged = true;
            }
            else {
                this.keysChanged.add(sub);
            }
        });
    }
    get changes() {
        if (this._changes === null) {
            const changes = { keys: this.keys, delta: this.delta, added: new Set(), deleted: new Set() };
            this._changes = changes;
        }
        return this._changes;
    }
    /**
     * Compute the changes in the delta format.
     * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
     */
    get delta() {
        var _a;
        if (this._delta != null)
            return this._delta;
        const deltas = [];
        (_a = this.target.doc) === null || _a === void 0 ? void 0 : _a.transact(transaction => {
            const currentAttributes = new Map(); // saves all current attributes for insert
            const oldAttributes = new Map();
            let item = this.target._start;
            let action = null;
            const attributes = {}; // counts added or removed new attributes for retain
            let insert = '';
            let retain = 0;
            let deleteLen = 0;
            const addDelta = () => {
                if (action === null)
                    return;
                let delta;
                if (action == "delete") {
                    delta = { delete: deleteLen };
                    deleteLen = 0;
                }
                else if (action == "insert") {
                    delta = { insert: insert };
                    if (currentAttributes.size > 0) {
                        delta.attributes = {};
                        currentAttributes.forEach((value, key) => {
                            if (value !== null) {
                                delta.attributes[key] = value;
                            }
                        });
                    }
                    insert = '';
                }
                else {
                    delta = { retain: retain };
                    if (Object.keys(attributes).length > 0) {
                        delta.attributes = {};
                        for (const key in attributes) {
                            delta.attributes[key] = attributes[key];
                        }
                    }
                    retain = 0;
                }
                deltas.push(delta);
                action = null;
            };
            while (item !== null) {
                if (item.content instanceof internals_1.ContentType || item.content instanceof internals_1.ContentEmbed) {
                    if (this.adds(item)) {
                        if (!this.deletes(item)) {
                            addDelta();
                            action = 'insert';
                            insert = item.content.getContent()[0];
                            addDelta();
                        }
                    }
                    else if (this.deletes(item)) {
                        if (action !== 'delete') {
                            addDelta();
                            action = 'delete';
                        }
                        deleteLen += 1;
                    }
                    else if (!item.deleted) {
                        if (action !== 'retain') {
                            addDelta();
                            action = 'retain';
                        }
                        retain += 1;
                    }
                }
                else if (item.content instanceof internals_1.ContentString) {
                    if (this.adds(item)) {
                        if (!this.deletes(item)) {
                            if (action !== 'insert') {
                                addDelta();
                                action = 'insert';
                            }
                            insert += item.content.str;
                        }
                    }
                    else if (this.deletes(item)) {
                        if (action !== 'delete') {
                            addDelta();
                            action = 'delete';
                        }
                        deleteLen += item.length;
                    }
                    else if (!item.deleted) {
                        if (action !== 'retain') {
                            addDelta();
                            action = 'retain';
                        }
                        retain += item.length;
                    }
                }
                else if (item.content instanceof internals_1.ContentFormat) {
                    const { key, value } = item.content;
                    if (this.adds(item)) {
                        if (!this.deletes(item)) {
                            const curVal = currentAttributes.get(key) || null;
                            if (!(0, internals_1.equalAttributes_)(curVal, value)) {
                                if (action === 'retain') {
                                    addDelta();
                                }
                                if ((0, internals_1.equalAttributes_)(value, (oldAttributes.get(key) || null))) {
                                    delete attributes[key];
                                }
                                else {
                                    attributes[key] = value;
                                }
                            }
                            else if (value !== null) {
                                item.delete(transaction);
                            }
                        }
                    }
                    else if (this.deletes(item)) {
                        oldAttributes.set(key, value);
                        const curVal = currentAttributes.get(key) || null;
                        if (!(0, internals_1.equalAttributes_)(curVal, value)) {
                            if (action === 'retain') {
                                addDelta();
                            }
                            attributes[key] = curVal;
                        }
                    }
                    else if (!item.deleted) {
                        oldAttributes.set(key, value);
                        const attr = attributes[key];
                        if (attr !== undefined) {
                            if (!(0, internals_1.equalAttributes_)(attr, value)) {
                                if (action === 'retain') {
                                    addDelta();
                                }
                                if (value === null) {
                                    delete attributes[key];
                                }
                                else {
                                    attributes[key] = value;
                                }
                            }
                            else if (attr !== null) { // this will be cleaned up automatically by the contextless cleanup function
                                item.delete(transaction);
                            }
                        }
                    }
                    if (!item.deleted) {
                        if (action === 'insert') {
                            addDelta();
                        }
                        updateCurrentAttributes(currentAttributes, item.content);
                    }
                }
                item = item.right;
            }
            addDelta();
            while (deltas.length > 0) {
                const lastOp = deltas[deltas.length - 1];
                if (lastOp.retain !== undefined && lastOp.attributes === undefined) {
                    // retain delta's if they don't assign attributes
                    deltas.pop();
                }
                else {
                    break;
                }
            }
        });
        this._delta = deltas;
        return deltas;
    }
}
exports.YTextEvent = YTextEvent;
/**
 * Type that represents text with formatting information.
 *
 * This type replaces y-richtext as this implementation is able to handle
 * block formats (format information on a paragraph), embeds (complex elements
 * like pictures and videos), and text formats (**bold**, *italic*).
 */
class YText extends AbstractType_1.AbstractType_ {
    /**
     * @param {String} [string] The initial value of the YText.
     */
    constructor(string) {
        super();
        this._pending = string !== undefined ? [() => this.insert(0, string)] : [];
        this._searchMarker = [];
    }
    /** Number of characters of this text type. */
    get length() { return this._length; }
    _integrate(y, item) {
        var _a;
        super._integrate(y, item);
        try {
            (_a = (this._pending)) === null || _a === void 0 ? void 0 : _a.forEach(f => f());
        }
        catch (e) {
            console.error(e);
        }
        this._pending = null;
    }
    _copy() {
        return new YText();
    }
    clone() {
        const text = new YText();
        text.applyDelta(this.toDelta());
        return text;
    }
    /**
     * Creates YTextEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction, parentSubs) {
        super._callObserver(transaction, parentSubs);
        const event = new YTextEvent(this, transaction, parentSubs);
        const doc = transaction.doc;
        this.callObservers(transaction, event);
        // If a remote change happened, we try to cleanup potential formatting duplicates.
        if (!transaction.local) {
            // check if another formatting item was inserted
            let foundFormattingItem = false;
            for (const [client, afterClock] of transaction.afterState.entries()) {
                const clock = transaction.beforeState.get(client) || 0;
                if (afterClock === clock) {
                    continue;
                }
                internals_1.StructStore.iterateStructs(transaction, doc.store.clients.get(client), clock, afterClock, item => {
                    if (!item.deleted && item.content.constructor === internals_1.ContentFormat) {
                        foundFormattingItem = true;
                    }
                });
                if (foundFormattingItem) {
                    break;
                }
            }
            if (!foundFormattingItem) {
                transaction.deleteSet.iterate(transaction, item => {
                    if (item instanceof internals_1.GC || foundFormattingItem) {
                        return;
                    }
                    if (item.parent === this && item.content.constructor === internals_1.ContentFormat) {
                        foundFormattingItem = true;
                    }
                });
            }
            doc.transact(t => {
                if (foundFormattingItem) {
                    // If a formatting item was inserted, we simply clean the whole type.
                    // We need to compute currentAttributes for the current position anyway.
                    (0, exports.cleanupYTextFormatting)(this);
                }
                else {
                    // If no formatting attribute was inserted, we can make due with contextless
                    // formatting cleanups.
                    // Contextless: it is not necessary to compute currentAttributes for the affected position.
                    t.deleteSet.iterate(t, item => {
                        if (item instanceof internals_1.GC) {
                            return;
                        }
                        if (item.parent === this) {
                            cleanupContextlessFormattingGap(t, item);
                        }
                    });
                }
            });
        }
    }
    /** Returns the unformatted string representation of this YText type. */
    toString() {
        let str = '';
        let n = this._start;
        while (n !== null) {
            if (!n.deleted && n.countable && n.content.constructor === internals_1.ContentString) {
                str += n.content.str;
            }
            n = n.right;
        }
        return str;
    }
    /**Returns the unformatted string representation of this YText type. */
    toJSON() {
        return this.toString();
    }
    /**
     * Apply a {@link Delta} on this shared YText type.
     *
     * @param {any} delta The changes to apply on this element.
     * @param {object}    opts
     * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
     *
     *
     * @public
     */
    applyDelta(delta, { sanitize = true } = {}) {
        var _a;
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                const currPos = new ItemTextListPosition(null, this._start, 0, new Map());
                for (let i = 0; i < delta.length; i++) {
                    const op = delta[i];
                    if (op.insert !== undefined) {
                        // Quill assumes that the content starts with an empty paragraph.
                        // Yjs/Y.Text assumes that it starts empty. We always hide that
                        // there is a newline at the end of the content.
                        // If we omit this step, clients will see a different number of
                        // paragraphs, but nothing bad will happen.
                        const ins = (!sanitize && typeof op.insert === 'string' && i === delta.length - 1 && currPos.right === null && op.insert.slice(-1) === '\n') ? op.insert.slice(0, -1) : op.insert;
                        if (typeof ins !== 'string' || ins.length > 0) {
                            insertText(transaction, this, currPos, ins, op.attributes || {});
                        }
                    }
                    else if (op.retain !== undefined) {
                        formatText(transaction, this, currPos, op.retain, op.attributes || {});
                    }
                    else if (op.delete !== undefined) {
                        deleteText(transaction, currPos, op.delete);
                    }
                }
            });
        }
        else {
            (_a = this._pending) === null || _a === void 0 ? void 0 : _a.push(() => this.applyDelta(delta));
        }
    }
    /** Returns the Delta representation of this YText type. */
    toDelta(snapshot, prevSnapshot, computeYChange) {
        const ops = [];
        const currentAttributes = new Map();
        const doc = this.doc;
        let str = '';
        let n = this._start;
        function packStr() {
            if (str.length > 0) {
                // pack str with attributes to ops
                const attributes = {};
                let addAttributes = false;
                currentAttributes.forEach((value, key) => {
                    addAttributes = true;
                    attributes[key] = value;
                });
                /**
                 * @type {Object<string,any>}
                 */
                const op = { insert: str };
                if (addAttributes) {
                    op.attributes = attributes;
                }
                ops.push(op);
                str = '';
            }
        }
        // snapshots are merged again after the transaction, so we need to keep the
        // transalive until we are done
        doc.transact(transaction => {
            if (snapshot) {
                snapshot.splitAffectedStructs(transaction);
            }
            if (prevSnapshot) {
                prevSnapshot.splitAffectedStructs(transaction);
            }
            while (n !== null) {
                if (n.isVisible(snapshot) || (prevSnapshot !== undefined && n.isVisible(prevSnapshot))) {
                    switch (n.content.constructor) {
                        case internals_1.ContentString: {
                            const cur = currentAttributes.get('ychange');
                            if (snapshot !== undefined && !n.isVisible(snapshot)) {
                                if (cur === undefined || cur.user !== n.id.client || cur.type !== 'removed') {
                                    packStr();
                                    currentAttributes.set('ychange', computeYChange ? computeYChange('removed', n.id) : { type: 'removed' });
                                }
                            }
                            else if (prevSnapshot !== undefined && !n.isVisible(prevSnapshot)) {
                                if (cur === undefined || cur.user !== n.id.client || cur.type !== 'added') {
                                    packStr();
                                    currentAttributes.set('ychange', computeYChange ? computeYChange('added', n.id) : { type: 'added' });
                                }
                            }
                            else if (cur !== undefined) {
                                packStr();
                                currentAttributes.delete('ychange');
                            }
                            str += n.content.str;
                            break;
                        }
                        case internals_1.ContentType:
                        case internals_1.ContentEmbed: {
                            packStr();
                            const op = {
                                insert: n.content.getContent()[0]
                            };
                            if (currentAttributes.size > 0) {
                                const attrs = ({});
                                op.attributes = attrs;
                                currentAttributes.forEach((value, key) => {
                                    attrs[key] = value;
                                });
                            }
                            ops.push(op);
                            break;
                        }
                        case internals_1.ContentFormat:
                            if (n.isVisible(snapshot)) {
                                packStr();
                                updateCurrentAttributes(currentAttributes, n.content);
                            }
                            break;
                    }
                }
                n = n.right;
            }
            packStr();
        }, 'cleanup');
        return ops;
    }
    /**
     * Insert text at a given index.
     *
     * @param {number} index The index at which to start inserting.
     * @param {String} text The text to insert at the specified position.
     * @param {TextAttributes} [attributes] Optionally define some formatting
     *                                                                        information to apply on the inserted
     *                                                                        Text.
     * @public
     */
    insert(index, text, attributes) {
        var _a;
        if (text.length <= 0) {
            return;
        }
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                const pos = ItemTextListPosition.find(transaction, this, index);
                if (!attributes) {
                    attributes = {};
                    pos.currentAttributes.forEach((v, k) => { attributes[k] = v; });
                }
                insertText(transaction, this, pos, text, attributes);
            });
        }
        else {
            (_a = (this._pending)) === null || _a === void 0 ? void 0 : _a.push(() => this.insert(index, text, attributes));
        }
    }
    /**
     * Inserts an embed at a index.
     *
     * @param {number} index The index to insert the embed at.
     * @param {Object | AbstractType_<any>} embed The Object that represents the embed.
     * @param {TextAttributes} attributes Attribute information to apply on the
     *                                                                        embed
     *
     * @public
     */
    insertEmbed(index, embed, attributes = {}) {
        var _a;
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                const pos = ItemTextListPosition.find(transaction, this, index);
                insertText(transaction, this, pos, embed, attributes);
            });
        }
        else {
            (_a = (this._pending)) === null || _a === void 0 ? void 0 : _a.push(() => this.insertEmbed(index, embed, attributes));
        }
    }
    /**
     * Deletes text starting from an index.
     *
     * @param {number} index Index at which to start deleting.
     * @param {number} length The number of characters to remove. Defaults to 1.
     *
     * @public
     */
    delete(index, length) {
        var _a;
        if (length === 0) {
            return;
        }
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                deleteText(transaction, ItemTextListPosition.find(transaction, this, index), length);
            });
        }
        else {
            (_a = (this._pending)) === null || _a === void 0 ? void 0 : _a.push(() => this.delete(index, length));
        }
    }
    /**
     * Assigns properties to a range of text.
     *
     * @param {number} index The position where to start formatting.
     * @param {number} length The amount of characters to assign properties to.
     * @param {TextAttributes} attributes Attribute information to apply on the
     *                                                                        text.
     *
     * @public
     */
    format(index, length, attributes) {
        var _a;
        if (length === 0) {
            return;
        }
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                const pos = ItemTextListPosition.find(transaction, this, index);
                if (pos.right === null) {
                    return;
                }
                formatText(transaction, this, pos, length, attributes);
            });
        }
        else {
            (_a = this._pending) === null || _a === void 0 ? void 0 : _a.push(() => this.format(index, length, attributes));
        }
    }
    /**
     * Removes an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    removeAttribute(attributeName) {
        var _a;
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.mapDelete(transaction, attributeName);
            });
        }
        else {
            (_a = this._pending) === null || _a === void 0 ? void 0 : _a.push(() => this.removeAttribute(attributeName));
        }
    }
    /**
     * Sets or updates an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be set.
     * @param {any} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    setAttribute(attributeName, attributeValue) {
        var _a;
        if (this.doc !== null) {
            this.doc.transact(transaction => {
                this.mapSet(transaction, attributeName, attributeValue);
            });
        }
        else {
            (_a = this._pending) === null || _a === void 0 ? void 0 : _a.push(() => this.setAttribute(attributeName, attributeValue));
        }
    }
    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that identifies the
     *                                                             queried value.
     * @return {any} The queried attribute value.
     *
     * @public
     */
    getAttribute(attributeName) {
        return this.mapGet(attributeName);
    }
    /**
     * Returns all attribute name/value pairs in a JSON Object.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @return {Object<string, any>} A JSON Object that describes the attributes.
     *
     * @public
     */
    getAttributes() {
        return this.mapGetAll();
    }
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     */
    _write(encoder) {
        encoder.writeTypeRef(internals_1.YTextRefID);
    }
}
exports.YText = YText;
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YText}
 *
 * @private
 * @function
 */
const readYText = (_decoder) => {
    return new YText();
};
exports.readYText = readYText;
