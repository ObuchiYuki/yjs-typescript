"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YEvent = void 0;
const internals_1 = require("../internals");
const set = require("lib0/set");
const array = require("lib0/array");
/** YEvent describes the changes on a YType. */
class YEvent {
    /**
     * @param {T} target The changed type.
     * @param {Transaction} transaction
     */
    constructor(target, transaction) {
        this.target = target;
        this.currentTarget = target;
        this.transaction = transaction;
        this._changes = null;
        this._keys = null;
        this._delta = null;
    }
    /**
     * Computes the path from `y` to the changed type.
     *
     * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
     *
     * The following property holds:
     * @example
     *     let type = y
     *     event.path.forEach(dir => {
     *         type = type.get(dir)
     *     })
     *     type === event.target // => true
     */
    get path() {
        // @ts-ignore _item is defined because target is integrated
        return getPathTo(this.currentTarget, this.target);
    }
    /**
     * Check if a struct is deleted by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {AbstractStruct} struct
     * @return {boolean}
     */
    deletes(struct) {
        return (0, internals_1.isDeleted)(this.transaction.deleteSet, struct.id);
    }
    get keys() {
        if (this._keys === null) {
            const keys = new Map();
            const target = this.target;
            const changed = this.transaction.changed.get(target);
            changed.forEach(key => {
                if (key !== null) {
                    const item = target._map.get(key);
                    let action;
                    let oldValue;
                    if (this.adds(item)) {
                        let prev = item.left;
                        while (prev !== null && this.adds(prev)) {
                            prev = prev.left;
                        }
                        if (this.deletes(item)) {
                            if (prev !== null && this.deletes(prev)) {
                                action = 'delete';
                                oldValue = array.last(prev.content.getContent());
                            }
                            else {
                                return;
                            }
                        }
                        else {
                            if (prev !== null && this.deletes(prev)) {
                                action = 'update';
                                oldValue = array.last(prev.content.getContent());
                            }
                            else {
                                action = 'add';
                                oldValue = undefined;
                            }
                        }
                    }
                    else {
                        if (this.deletes(item)) {
                            action = 'delete';
                            oldValue = array.last(item.content.getContent());
                        }
                        else {
                            return; // nop
                        }
                    }
                    keys.set(key, { action, oldValue });
                }
            });
            this._keys = keys;
        }
        return this._keys;
    }
    /**
     * @type {Array<{insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
     */
    get delta() {
        return this.changes.delta;
    }
    /**
     * Check if a struct is added by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     */
    adds(struct) {
        return struct.id.clock >= (this.transaction.beforeState.get(struct.id.client) || 0);
    }
    get changes() {
        let changes = this._changes;
        if (changes === null) {
            const target = this.target;
            const added = set.create();
            const deleted = set.create();
            const delta = [];
            changes = {
                added,
                deleted,
                delta,
                keys: this.keys
            };
            const changed = this.transaction.changed.get(target);
            if (changed.has(null)) {
                let lastOp = null;
                const packOp = () => {
                    if (lastOp) {
                        delta.push(lastOp);
                    }
                };
                for (let item = target._start; item !== null; item = item.right) {
                    if (item.deleted) {
                        if (this.deletes(item) && !this.adds(item)) {
                            if (lastOp === null || lastOp.delete === undefined) {
                                packOp();
                                lastOp = { delete: 0 };
                            }
                            lastOp.delete += item.length;
                            deleted.add(item);
                        } // else nop
                    }
                    else {
                        if (this.adds(item)) {
                            if (lastOp === null || lastOp.insert === undefined) {
                                packOp();
                                lastOp = { insert: [] };
                            }
                            lastOp.insert = lastOp.insert.concat(item.content.getContent());
                            added.add(item);
                        }
                        else {
                            if (lastOp === null || lastOp.retain === undefined) {
                                packOp();
                                lastOp = { retain: 0 };
                            }
                            lastOp.retain += item.length;
                        }
                    }
                }
                if (lastOp !== null && lastOp.retain === undefined) {
                    packOp();
                }
            }
            this._changes = changes;
        }
        return changes;
    }
}
exports.YEvent = YEvent;
/**
 * Compute the path from this type to the specified target.
 *
 * @example
 *     // `child` should be accessible via `type.get(path[0]).get(path[1])..`
 *     const path = type.getPathTo(child)
 *     // assuming `type instanceof YArray`
 *     console.log(path) // might look like => [2, 'key1']
 *     child === type.get(path[0]).get(path[1])
 *
 * @param {AbstractType<any>} parent
 * @param {AbstractType<any>} child target
 * @return {Array<string|number>} Path to the target
 *
 * @private
 * @function
 */
const getPathTo = (parent, child) => {
    const path = [];
    while (child._item !== null && child !== parent) {
        if (child._item.parentSub !== null) {
            // parent is map-ish
            path.unshift(child._item.parentSub);
        }
        else {
            // parent is array-ish
            let i = 0;
            let c = child._item.parent._start;
            while (c !== child._item && c !== null) {
                if (!c.deleted) {
                    i++;
                }
                c = c.right;
            }
            path.unshift(i);
        }
        child = child._item.parent;
    }
    return path;
};
