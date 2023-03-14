
import {
    UpdateEncoderV2,
    DSDecoderV1, DSEncoderV1, DSDecoderV2, DSEncoderV2, Item, GC, StructStore, Transaction, ID, // eslint-disable-line
    Struct_
} from '../internals'

import * as array from 'lib0/array'
import * as math from 'lib0/math'
import * as map from 'lib0/map'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

export class DeleteItem {
    constructor(public clock: number, public len: number) {}

    static findIndex(dis: DeleteItem[], clock: number): number | null {
        let left = 0
        let right = dis.length - 1
        while (left <= right) {
            const midindex = math.floor((left + right) / 2)
            const mid = dis[midindex]
            const midclock = mid.clock
            if (midclock <= clock) {
                if (clock < midclock + mid.len) {
                    return midindex
                }
                left = midindex + 1
            } else {
                right = midindex - 1
            }
        }
        return null
    }
}

/**
 * We no longer maintain a DeleteStore. DeleteSet is a temporary object that is created when needed.
 * - When created in a transaction, it must only be accessed after sorting, and merging
 *     - This DeleteSet is send to other clients
 * - We do not create a DeleteSet when we send a sync message. The DeleteSet message is created directly from StructStore
 * - We read a DeleteSet as part of a sync/update message. In this case the DeleteSet is already sorted and merged.
 */
export class DeleteSet {
    clients: Map<number, DeleteItem[]> = new Map()

    /** Iterate over all structs that the DeleteSet gc's. */
    iterate(transaction: Transaction, body: (v: GC | Item) => void) {
        return this.clients.forEach((deletes, clientid) => {
            const structs = transaction.doc.store.clients.get(clientid)!
            for (let i = 0; i < deletes.length; i++) {
                const del = deletes[i]
                StructStore.iterateStructs(transaction, structs, del.clock, del.len, body)
            }
        })
    }

    isDeleted(id: ID): boolean {
        const dis = this.clients.get(id.client)
        return dis !== undefined && DeleteItem.findIndex(dis, id.clock) !== null
    }

    sortAndMerge() {
        this.clients.forEach(dels => {
            dels.sort((a, b) => a.clock - b.clock)
            let i, j
            for (i = 1, j = 1; i < dels.length; i++) {
                const left = dels[j - 1]
                const right = dels[i]
                if (left.clock + left.len >= right.clock) {
                    left.len = math.max(left.len, right.clock + right.len - left.clock)
                } else {
                    if (j < i) { dels[j] = right }
                    j++
                }
            }
            dels.length = j
        })
    }

    add(client: number, clock: number, length: number){
        map.setIfUndefined(this.clients, client, () => [] as DeleteItem[])
            .push(new DeleteItem(clock, length))
    }
    
    encode(encoder: DSEncoderV1 | DSEncoderV2) {
        encoding.writeVarUint(encoder.restEncoder, this.clients.size)
    
        // Ensure that the delete set is written in a deterministic order
        array.from(this.clients.entries())
            .sort((a, b) => b[0] - a[0])
            .forEach(([client, dsitems]) => {
                encoder.resetDsCurVal()
                encoding.writeVarUint(encoder.restEncoder, client)
                const len = dsitems.length
                encoding.writeVarUint(encoder.restEncoder, len)
                for (let i = 0; i < len; i++) {
                    const item = dsitems[i]
                    encoder.writeDsClock(item.clock)
                    encoder.writeDsLen(item.len)
                }
            })
    }

    tryGCDeleteSet(store: StructStore, gcFilter: (arg0: Item) => boolean) {
        for (const [client, deleteItems] of this.clients.entries()) {
            const structs = store.clients.get(client) as (GC|Item)[]
            for (let di = deleteItems.length - 1; di >= 0; di--) {
                const deleteItem = deleteItems[di]
                const endDeleteItemClock = deleteItem.clock + deleteItem.len
                for (
                    let si = StructStore.findIndexSS(structs, deleteItem.clock), struct = structs[si];
                    si < structs.length && struct.id.clock < endDeleteItemClock;
                    struct = structs[++si]
                ) {
                    const struct = structs[si]
                    if (deleteItem.clock + deleteItem.len <= struct.id.clock) {
                        break
                    }
                    if (struct instanceof Item && struct.deleted && !struct.keep && gcFilter(struct)) {
                        struct.gc(store, false)
                    }
                }
            }
        }
    }

    // try
    tryMerge(store: StructStore) {
        // try to merge deleted / gc'd items
        // merge from right to left for better efficiecy and so we don't miss any merge targets
        this.clients.forEach((deleteItems, client) => {
            const structs = store.clients.get(client) as Array<GC|Item>
            for (let di = deleteItems.length - 1; di >= 0; di--) {
                const deleteItem = deleteItems[di]
                // start with merging the item next to the last deleted item
                const mostRightIndexToCheck = math.min(structs.length - 1, 1 + StructStore.findIndexSS(structs, deleteItem.clock + deleteItem.len - 1))
                for (
                    let si = mostRightIndexToCheck, struct = structs[si];
                    si > 0 && struct.id.clock >= deleteItem.clock;
                    struct = structs[--si]
                ) {
                    Struct_.tryMergeWithLeft(structs, si)
                }
            }
        })
    }

    tryGC(store: StructStore, gcFilter: (arg0: Item) => boolean) {
        this.tryGCDeleteSet(store, gcFilter)
        this.tryMerge(store)
    }
    
    

    static mergeAll(dss: DeleteSet[]): DeleteSet {
        const merged = new DeleteSet()
        for (let dssI = 0; dssI < dss.length; dssI++) {
            dss[dssI].clients.forEach((delsLeft, client) => {
                if (!merged.clients.has(client)) {
                    const dels: DeleteItem[] = delsLeft.slice()
                    for (let i = dssI + 1; i < dss.length; i++) {
                        array.appendTo(dels, dss[i].clients.get(client) || [])
                    }
                    merged.clients.set(client, dels)
                }
            })
        }
        merged.sortAndMerge()
        return merged
    }

    static decode(decoder: DSDecoderV1 | DSDecoderV2): DeleteSet{
        const ds = new DeleteSet()
        const numClients = decoding.readVarUint(decoder.restDecoder)
        for (let i = 0; i < numClients; i++) {
            decoder.resetDsCurVal()
            const client = decoding.readVarUint(decoder.restDecoder)
            const numberOfDeletes = decoding.readVarUint(decoder.restDecoder)
            if (numberOfDeletes > 0) {
                const dsField = map.setIfUndefined(ds.clients, client, () => [] as DeleteItem[])
                for (let i = 0; i < numberOfDeletes; i++) {
                    dsField.push(new DeleteItem(decoder.readDsClock(), decoder.readDsLen()))
                }
            }
        }
        return ds
    }
    
    static createFromStructStore(ss: StructStore): DeleteSet {
        const ds = new DeleteSet()
        ss.clients.forEach((structs, client) => {
            const dsitems: DeleteItem[] = []
            for (let i = 0; i < structs.length; i++) {
                const struct = structs[i]
                if (struct.deleted) {
                    const clock = struct.id.clock
                    let len = struct.length
                    if (i + 1 < structs.length) {
                        for (let next = structs[i + 1]; i + 1 < structs.length && next.deleted; next = structs[++i + 1]) {
                            len += next.length
                        }
                    }
                    dsitems.push(new DeleteItem(clock, len))
                }
            }
            if (dsitems.length > 0) {
                ds.clients.set(client, dsitems)
            }
        })
        return ds
    }

    static decodeAndApply(decoder: DSDecoderV1 | DSDecoderV2, transaction: Transaction, store: StructStore): Uint8Array | null {
        const unappliedDS = new DeleteSet()
        const numClients = decoding.readVarUint(decoder.restDecoder)
        for (let i = 0; i < numClients; i++) {
            decoder.resetDsCurVal()
            const client = decoding.readVarUint(decoder.restDecoder)
            const numberOfDeletes = decoding.readVarUint(decoder.restDecoder)
            const structs = store.clients.get(client) || []
            const state = store.getState(client)
            for (let i = 0; i < numberOfDeletes; i++) {
                const clock = decoder.readDsClock()
                const clockEnd = clock + decoder.readDsLen()
                if (clock < state) {
                    if (state < clockEnd) {
                        unappliedDS.add(client, state, clockEnd - state)
                    }
                    let index = StructStore.findIndexSS(structs, clock)
                    /**
                     * We can ignore the case of GC and Delete structs, because we are going to skip them
                     * @type {Item}
                     */
                    let struct: Item = structs[index] as Item
                    // split the first item if necessary
                    if (!struct.deleted && struct.id.clock < clock) {
                        structs.splice(index + 1, 0, struct.split(transaction, clock - struct.id.clock))
                        index++ // increase we now want to use the next struct
                    }
                    while (index < structs.length) {
                        struct = structs[index++] as Item
                        if (struct.id.clock < clockEnd) {
                            if (!struct.deleted) {
                                if (clockEnd < struct.id.clock + struct.length) {
                                    structs.splice(index, 0, struct.split(transaction, clockEnd - struct.id.clock))
                                }
                                struct.delete(transaction)
                            }
                        } else {
                            break
                        }
                    }
                } else {
                    unappliedDS.add(client, clock, clockEnd - clock)
                }
            }
        }
        if (unappliedDS.clients.size > 0) {
            const ds = new UpdateEncoderV2()
            encoding.writeVarUint(ds.restEncoder, 0) // encode 0 structs
            unappliedDS.encode(ds)
            return ds.toUint8Array()
        }
        return null
    }

}