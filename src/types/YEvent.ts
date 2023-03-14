
import {
    Item, AbstractType_, Transaction, __AbstractStruct, // eslint-disable-line
    Struct_
} from '../internals'

import * as set from 'lib0/set'
import * as array from 'lib0/array'

export type YEventDelta = { 
    insert?: string | Array<any> | object | AbstractType_<any>,
    retain?: number,
    delete?: number, 
    attributes?: { [s: string]: any }
}

export type YEventAction = 'add' | 'update' | 'delete'

export type YEventKey = { 
    action: YEventAction
    oldValue: any,
    newValue?: any 
}

export type YEventChange = { 
    added: Set<Item>,
    deleted: Set<Item>,
    keys: Map<string, YEventKey>, 
    delta: YEventDelta[]
}

/** YEvent describes the changes on a YType. */
export class YEvent<T extends AbstractType_<any>> {
    target: T
    currentTarget: AbstractType_<any>
    transaction: Transaction
    
    _changes: YEventChange|null = null
    _keys: Map<string, YEventKey>|null = null
    _delta: YEventDelta[]|null = null

    /**
     * @param {T} target The changed type.
     * @param {Transaction} transaction
     */
    constructor(target: T, transaction: Transaction) {
        this.target = target
        this.currentTarget = target
        this.transaction = transaction
    }

    /**
     * Computes the path from `y` to the changed type.
     *
     * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
     *
     * The following property holds:
     * @example
     *     let type = y
     *     event.path.forEach(dir => { type = type.get(dir) })
     *     type === event.target // => true
     */
    get path() { return getPathTo(this.currentTarget, this.target) }

    /**
     * Check if a struct is deleted by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {Struct_} struct
     * @return {boolean}
     */
    deletes(struct: Struct_): boolean {
        return this.transaction.deleteSet.isDeleted(struct.id)
    }

    get keys(): Map<string, YEventKey> {
        if (this._keys != null) return this._keys

        const keys = new Map<string, YEventKey>()
        const target = this.target
        const changed = this.transaction.changed.get(target)!

        changed.forEach(key => {
            if (key !== null) {
                const item = target._map.get(key)!
                let action: YEventAction
                let oldValue: any

                if (this.adds(item)) {
                    let prev = item.left
                    while (prev !== null && this.adds(prev)) { prev = prev.left }
                    
                    if (this.deletes(item)) {
                        if (prev !== null && this.deletes(prev)) {
                            action = 'delete'
                            oldValue = array.last(prev.content.getContent())
                        } else { return }
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
                    } else { return }
                }

                keys.set(key, { action: action, oldValue: oldValue })
            }
        })

        this._keys = keys
        return keys
    }

    get delta(): YEventDelta[] {
        return this.changes.delta
    }

    /**
     * Check if a struct is added by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     */
    adds(struct: Struct_): boolean {
        return struct.id.clock >= (this.transaction.beforeState.get(struct.id.client) || 0)
    }

    get changes(): YEventChange {
        if (this._changes != null) return this._changes
        
        const changes: YEventChange = { added: new Set(), deleted: new Set(), delta: [], keys: this.keys }
        const changed = this.transaction.changed.get(this.target)!

        if (changed.has(null)) {
            let lastDelta: YEventDelta|null = null
            const packDelta = () => {
                if (lastDelta) { changes.delta.push(lastDelta) }
            }
            for (let item = this.target._start; item !== null; item = item.right) {
                if (item.deleted) {
                    if (this.deletes(item) && !this.adds(item)) {
                        if (lastDelta === null || lastDelta.delete === undefined) {
                            packDelta()
                            lastDelta = { delete: 0 }
                        }
                        lastDelta.delete! += item.length
                        changes.deleted.add(item)
                    } // else nop
                } else {
                    if (this.adds(item)) {
                        if (lastDelta === null || lastDelta.insert === undefined) {
                            packDelta()
                            lastDelta = { insert: [] }
                        }
                        lastDelta.insert = (lastDelta.insert as any[]).concat(item.content.getContent())
                        changes.added.add(item)
                    } else {
                        if (lastDelta === null || lastDelta.retain === undefined) {
                            packDelta()
                            lastDelta = { retain: 0 }
                        }
                        lastDelta.retain! += item.length
                    }
                }
            }
            if (lastDelta !== null && lastDelta.retain === undefined) {
                packDelta()
            }
        }
        this._changes = changes
        return changes
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
