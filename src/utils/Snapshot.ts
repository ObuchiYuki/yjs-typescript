
import {
    writeStateVector,
    readStateVector,
    UpdateEncoderV2,
    applyUpdateV2,
    DSEncoderV1, DSEncoderV2, DSDecoderV1, DSDecoderV2, Transaction, Doc, DeleteSet, Item, // eslint-disable-line
    StructStore, ID
} from '../internals'

import * as map from 'lib0/map'
import * as set from 'lib0/set'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'

export class Snapshot {
    ds: DeleteSet
    
    /** State Map */
    sv: Map<number, number>

    constructor(ds: DeleteSet, sv: Map<number, number>) {
        this.ds = ds
        this.sv = sv
    }

    static snapshot(doc: { store: StructStore }): Snapshot {
        return new Snapshot(
            DeleteSet.createFromStructStore(doc.store),
            doc.store.getStateVector()
        )
    }

    static empty(): Snapshot {
        return new Snapshot(new DeleteSet(), new Map())
    }

    encodeV2(encoder: DSEncoderV1 | DSEncoderV2 = new DSEncoderV2()): Uint8Array {
        this.ds.encode(encoder)
        writeStateVector(encoder, this.sv)
        return encoder.toUint8Array()
    }
    
    encode(): Uint8Array {
        return this.encodeV2(new DSEncoderV1())
    }
    
    static decodeV2(buf: Uint8Array, decoder: DSDecoderV1 | DSDecoderV2 = new DSDecoderV2(decoding.createDecoder(buf))): Snapshot {
        return new Snapshot(DeleteSet.decode(decoder), readStateVector(decoder))
    }
    
    static decode(buf: Uint8Array): Snapshot {
        return Snapshot.decodeV2(buf, new DSDecoderV1(decoding.createDecoder(buf)))
    }
   
    splitAffectedStructs(transaction: Transaction) {
        const meta = map.setIfUndefined(transaction.meta, this.splitAffectedStructs, set.create)
        const store = transaction.doc.store
        // check if we already split for this snapshot
        if (!meta.has(this)) {
            this.sv.forEach((clock, client) => {
                if (clock < store.getState(client)) {
                    StructStore.getItemCleanStart(transaction, new ID(client, clock))
                }
            })
            this.ds.iterate(transaction, item => {})
            meta.add(this)
        }
    }

    
    toDoc(originDoc: Doc, newDoc: Doc = new Doc()): Doc {
        if (originDoc.gc) {
            throw new Error('originDoc must not be garbage collected')
        }
        const { sv, ds } = this
    
        const encoder = new UpdateEncoderV2()
        originDoc.transact(transaction => {
            let size = 0
            sv.forEach(clock => {
                if (clock > 0) {
                    size++
                }
            })
            encoding.writeVarUint(encoder.restEncoder, size)
            // splitting the structs before writing them to the encoder
            for (const [client, clock] of sv) {
                if (clock === 0) {
                    continue
                }
                if (clock < originDoc.store.getState(client)) {
                    StructStore.getItemCleanStart(transaction, new ID(client, clock))
                }
                const structs = originDoc.store.clients.get(client) || []
                const lastStructIndex = StructStore.findIndexSS(structs, clock - 1)
                // write # encoded structs
                encoding.writeVarUint(encoder.restEncoder, lastStructIndex + 1)
                encoder.writeClient(client)
                // first clock written is 0
                encoding.writeVarUint(encoder.restEncoder, 0)
                for (let i = 0; i <= lastStructIndex; i++) {
                    structs[i].write(encoder, 0)
                }
            }
            ds.encode(encoder)
        })
    
        applyUpdateV2(newDoc, encoder.toUint8Array(), 'snapshot')
        return newDoc
    }
    
}


export const equalSnapshots = (snap1: Snapshot, snap2: Snapshot): boolean => {
    const ds1 = snap1.ds.clients
    const ds2 = snap2.ds.clients
    const sv1 = snap1.sv
    const sv2 = snap2.sv
    if (sv1.size !== sv2.size || ds1.size !== ds2.size) {
        return false
    }
    for (const [key, value] of sv1.entries()) {
        if (sv2.get(key) !== value) {
            return false
        }
    }
    for (const [client, dsitems1] of ds1.entries()) {
        const dsitems2 = ds2.get(client) || []
        if (dsitems1.length !== dsitems2.length) {
            return false
        }
        for (let i = 0; i < dsitems1.length; i++) {
            const dsitem1 = dsitems1[i]
            const dsitem2 = dsitems2[i]
            if (dsitem1.clock !== dsitem2.clock || dsitem1.len !== dsitem2.len) {
                return false
            }
        }
    }
    return true
}
