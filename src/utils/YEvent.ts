
import {
    isDeleted,
    Item, AbstractType_, Transaction, __AbstractStruct // eslint-disable-line
} from '../internals'

import * as set from 'lib0/set'
import * as array from 'lib0/array'

/** YEvent describes the changes on a YType. */
export class YEvent<T extends AbstractType_<any>> {
    target: T
    currentTarget: AbstractType_<any>
    transaction: Transaction
    _changes: object|null
    _keys: null | Map<string, { action: 'add' | 'update' | 'delete', oldValue: any, newValue: any }>
    _delta: null | Array<{ insert?: string | Array<any> | object | AbstractType_<any>, retain?: number, delete?: number, attributes?: { [s: string]: any }}>

    /**
     * @param {T} target The changed type.
     * @param {Transaction} transaction
     */
    constructor(target: T, transaction: Transaction) {
        this.target = target
        this.currentTarget = target
        this.transaction = transaction
        this._changes = null
        this._keys = null
        this._delta = null
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
        return getPathTo(this.currentTarget, this.target)
    }

    /**
     * Check if a struct is deleted by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {__AbstractStruct} struct
     * @return {boolean}
     */
    deletes(struct: __AbstractStruct): boolean {
        return isDeleted(this.transaction.deleteSet, struct.id)
    }

    get keys(): Map<string, { action: 'add' | 'update' | 'delete', oldValue: any, newValue: any }> {
        if (this._keys === null) {
            const keys = new Map()
            const target = this.target
            const changed = this.transaction.changed.get(target) as Set<string|null>
            changed.forEach(key => {
                if (key !== null) {
                    const item = target._map.get(key) as Item
                    let action: 'delete' | 'add' | 'update'
                    let oldValue
                    if (this.adds(item)) {
                        let prev = item.left
                        while (prev !== null && this.adds(prev)) {
                            prev = prev.left
                        }
                        if (this.deletes(item)) {
                            if (prev !== null && this.deletes(prev)) {
                                action = 'delete'
                                oldValue = array.last(prev.content.getContent())
                            } else {
                                return
                            }
                        } else {
                            if (prev !== null && this.deletes(prev)) {
                                action = 'update'
                                oldValue = array.last(prev.content.getContent())
                            } else {
                                action = 'add'
                                oldValue = undefined
                            }
                        }
                    } else {
                        if (this.deletes(item)) {
                            action = 'delete'
                            oldValue = array.last(item.content.getContent())
                        } else {
                            return // nop
                        }
                    }
                    keys.set(key, { action, oldValue })
                }
            })
            this._keys = keys
        }
        return this._keys
    }

    /**
     * @type {Array<{insert?: string | Array<any> | object | AbstractType_<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
     */
    get delta(): Array<{insert?: string | Array<any> | object | AbstractType_<any>, retain?: number, delete?: number, attributes?: { [s: string]: any }}> {
        return this.changes.delta
    }

    /**
     * Check if a struct is added by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     */
    adds (struct: __AbstractStruct): boolean {
        return struct.id.clock >= (this.transaction.beforeState.get(struct.id.client) || 0)
    }

    get changes(): {added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>} {
        let changes = this._changes
        if (changes === null) {
            const target = this.target
            const added = set.create()
            const deleted = set.create()
            const delta: Array<{insert:Array<any>}|{delete:number}|{retain:number}> = []
            changes = {
                added,
                deleted,
                delta,
                keys: this.keys
            }
            const changed = this.transaction.changed.get(target)!
            if (changed.has(null)) {
                let lastOp: any = null
                const packOp = () => {
                    if (lastOp) {
                        delta.push(lastOp)
                    }
                }
                for (let item = target._start; item !== null; item = item.right) {
                    if (item.deleted) {
                        if (this.deletes(item) && !this.adds(item)) {
                            if (lastOp === null || lastOp.delete === undefined) {
                                packOp()
                                lastOp = { delete: 0 }
                            }
                            lastOp.delete += item.length
                            deleted.add(item)
                        } // else nop
                    } else {
                        if (this.adds(item)) {
                            if (lastOp === null || lastOp.insert === undefined) {
                                packOp()
                                lastOp = { insert: [] }
                            }
                            lastOp.insert = lastOp.insert.concat(item.content.getContent())
                            added.add(item)
                        } else {
                            if (lastOp === null || lastOp.retain === undefined) {
                                packOp()
                                lastOp = { retain: 0 }
                            }
                            lastOp.retain += item.length
                        }
                    }
                }
                if (lastOp !== null && lastOp.retain === undefined) {
                    packOp()
                }
            }
            this._changes = changes
        }
        return changes as any
    }
}

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
 * @param {AbstractType_<any>} parent
 * @param {AbstractType_<any>} child target
 * @return {Array<string|number>} Path to the target
 *
 * @private
 * @function
 */
const getPathTo = (parent: AbstractType_<any>, child: AbstractType_<any>): Array<string | number> => {
    const path = []
    while (child._item !== null && child !== parent) {
        if (child._item.parentSub !== null) {
            // parent is map-ish
            path.unshift(child._item.parentSub)
        } else {
            // parent is array-ish
            let i = 0
            let c = (child._item.parent as AbstractType_<any>)._start
            while (c !== child._item && c !== null) {
                if (!c.deleted) {
                    i++
                }
                c = c.right
            }
            path.unshift(i)
        }
        child = child._item.parent as AbstractType_<any>
    }
    return path
}
