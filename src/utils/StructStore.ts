

import {
    GC,
    Transaction, ID, Item, DSDecoderV2 // eslint-disable-line
} from '../internals'

import * as lib0 from 'lib0-typescript'

export class StructStore {
    clients: Map<number,Array<GC|Item>>
    pendingStructs: null | { missing: Map<number, number>, update: Uint8Array }
    pendingDs: null | Uint8Array

    constructor() {
        this.clients = new Map()
        this.pendingStructs = null
        this.pendingDs = null
    }

    /** Return the states as a Map<client,clock>. Note that clock refers to the next expected clock id. */
    getStateVector(): Map<number, number> {
        const sm = new Map()
        this.clients.forEach((structs, client) => {
            const struct = structs[structs.length - 1]
            sm.set(client, struct.id.clock + struct.length)
        })
        return sm
    }

    getState(client: number): number {
        const structs = this.clients.get(client)
        if (structs === undefined) {
            return 0
        }
        const lastStruct = structs[structs.length - 1]
        return lastStruct.id.clock + lastStruct.length
    }

    integretyCheck() {
        this.clients.forEach(structs => {
            for (let i = 1; i < structs.length; i++) {
                const l = structs[i - 1]
                const r = structs[i]
                if (l.id.clock + l.length !== r.id.clock) {
                    throw new Error('StructStore failed integrety check')
                }
            }
        })
    }


    addStruct(struct: GC | Item) {
        let structs = this.clients.get(struct.id.client)
        if (structs === undefined) {
            structs = []
            this.clients.set(struct.id.client, structs)
        } else {
            const lastStruct = structs[structs.length - 1]
            if (lastStruct.id.clock + lastStruct.length !== struct.id.clock) {
                throw new lib0.UnexpectedCaseError()
            }
        }
        structs.push(struct)
    }

    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    find(id: ID): GC | Item {
        const structs = this.clients.get(id.client) as Array<GC|Item>
        return structs[StructStore.findIndexSS(structs, id.clock)]
    }


    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    getItem(id: ID): Item { return this.find(id) as Item }


    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    static getItemCleanStart(transaction: Transaction, id: ID): Item {
        const structs = transaction.doc.store.clients.get(id.client) as Array<Item>
        return structs[this.findIndexCleanStart(transaction, structs, id.clock)]
    }

    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    getItemCleanEnd(transaction: Transaction, id: ID): Item {
        const structs = this.clients.get(id.client) as Array<Item>
        const index = StructStore.findIndexSS(structs, id.clock)
        const struct = structs[index]
        if (id.clock !== struct.id.clock + struct.length - 1 && struct.constructor !== GC) {
            structs.splice(index + 1, 0, struct.split(transaction, id.clock - struct.id.clock + 1))
        }
        return struct
    }

    /** Replace `item` with `newitem` in store */
    replaceStruct(struct: GC | Item, newStruct: GC | Item) {
        const structs = this.clients.get(struct.id.client) as Array<GC|Item>
        structs[StructStore.findIndexSS(structs, struct.id.clock)] = newStruct
    }

    /** Iterate over a range of structs */
    static iterateStructs = (transaction: Transaction, structs: Array<Item | GC>, clockStart: number, len: number, f: (arg0: GC | Item) => void) => {
        if (len === 0) {
            return
        }
        const clockEnd = clockStart + len
        let index = this.findIndexCleanStart(transaction, structs, clockStart)
        let struct
        do {
            struct = structs[index++]
            if (clockEnd < struct.id.clock + struct.length) {
                this.findIndexCleanStart(transaction, structs, clockEnd)
            }
            f(struct)
        } while (index < structs.length && structs[index].id.clock < clockEnd)
    }


    /** Perform a binary search on a sorted array */
    static findIndexSS = (structs: Array<Item | GC>, clock: number): number => {
        let left = 0
        let right = structs.length - 1
        let mid = structs[right]
        let midclock = mid.id.clock
        if (midclock === clock) {
            return right
        }
        // @todo does it even make sense to pivot the search?
        // If a good split misses, it might actually increase the time to find the correct item.
        // Currently, the only advantage is that search with pivoting might find the item on the first try.
        let midindex = Math.floor((clock / (midclock + mid.length - 1)) * right) // pivoting the search
        while (left <= right) {
            mid = structs[midindex]
            midclock = mid.id.clock
            if (midclock <= clock) {
                if (clock < midclock + mid.length) {
                    return midindex
                }
                left = midindex + 1
            } else {
                right = midindex - 1
            }
            midindex = Math.floor((left + right) / 2)
        }
        // Always check state before looking for a struct in StructStore
        // Therefore the case of not finding a struct is unexpected
        throw new lib0.UnexpectedCaseError()
    }

    static findIndexCleanStart = (transaction: Transaction, structs: Array<Item | GC>, clock: number) => {
        const index = StructStore.findIndexSS(structs, clock)
        const struct = structs[index]
        if (struct.id.clock < clock && struct instanceof Item) {
            structs.splice(index + 1, 0, struct.split(transaction, clock - struct.id.clock))
            return index + 1
        }
        return index
    }
}

