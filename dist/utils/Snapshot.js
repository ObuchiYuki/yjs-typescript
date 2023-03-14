"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equalSnapshots = exports.Snapshot = void 0;
const internals_1 = require("../internals");
const map = require("lib0/map");
const set = require("lib0/set");
const decoding = require("lib0/decoding");
const encoding = require("lib0/encoding");
class Snapshot {
    constructor(ds, sv) {
        this.ds = ds;
        this.sv = sv;
    }
    static snapshot(doc) {
        return new Snapshot(internals_1.DeleteSet.createFromStructStore(doc.store), doc.store.getStateVector());
    }
    static empty() {
        return new Snapshot(new internals_1.DeleteSet(), new Map());
    }
    encodeV2(encoder = new internals_1.DSEncoderV2()) {
        this.ds.encode(encoder);
        (0, internals_1.writeStateVector)(encoder, this.sv);
        return encoder.toUint8Array();
    }
    encode() {
        return this.encodeV2(new internals_1.DSEncoderV1());
    }
    static decodeV2(buf, decoder = new internals_1.DSDecoderV2(decoding.createDecoder(buf))) {
        return new Snapshot(internals_1.DeleteSet.decode(decoder), (0, internals_1.readStateVector)(decoder));
    }
    static decode(buf) {
        return Snapshot.decodeV2(buf, new internals_1.DSDecoderV1(decoding.createDecoder(buf)));
    }
    splitAffectedStructs(transaction) {
        const meta = map.setIfUndefined(transaction.meta, this.splitAffectedStructs, set.create);
        const store = transaction.doc.store;
        // check if we already split for this snapshot
        if (!meta.has(this)) {
            this.sv.forEach((clock, client) => {
                if (clock < store.getState(client)) {
                    internals_1.StructStore.getItemCleanStart(transaction, new internals_1.ID(client, clock));
                }
            });
            this.ds.iterate(transaction, item => { });
            meta.add(this);
        }
    }
    toDoc(originDoc, newDoc = new internals_1.Doc()) {
        if (originDoc.gc) {
            throw new Error('originDoc must not be garbage collected');
        }
        const { sv, ds } = this;
        const encoder = new internals_1.UpdateEncoderV2();
        originDoc.transact(transaction => {
            let size = 0;
            sv.forEach(clock => {
                if (clock > 0) {
                    size++;
                }
            });
            encoding.writeVarUint(encoder.restEncoder, size);
            // splitting the structs before writing them to the encoder
            for (const [client, clock] of sv) {
                if (clock === 0) {
                    continue;
                }
                if (clock < originDoc.store.getState(client)) {
                    internals_1.StructStore.getItemCleanStart(transaction, new internals_1.ID(client, clock));
                }
                const structs = originDoc.store.clients.get(client) || [];
                const lastStructIndex = internals_1.StructStore.findIndexSS(structs, clock - 1);
                // write # encoded structs
                encoding.writeVarUint(encoder.restEncoder, lastStructIndex + 1);
                encoder.writeClient(client);
                // first clock written is 0
                encoding.writeVarUint(encoder.restEncoder, 0);
                for (let i = 0; i <= lastStructIndex; i++) {
                    structs[i].write(encoder, 0);
                }
            }
            ds.encode(encoder);
        });
        (0, internals_1.applyUpdateV2)(newDoc, encoder.toUint8Array(), 'snapshot');
        return newDoc;
    }
}
exports.Snapshot = Snapshot;
const equalSnapshots = (snap1, snap2) => {
    const ds1 = snap1.ds.clients;
    const ds2 = snap2.ds.clients;
    const sv1 = snap1.sv;
    const sv2 = snap2.sv;
    if (sv1.size !== sv2.size || ds1.size !== ds2.size) {
        return false;
    }
    for (const [key, value] of sv1.entries()) {
        if (sv2.get(key) !== value) {
            return false;
        }
    }
    for (const [client, dsitems1] of ds1.entries()) {
        const dsitems2 = ds2.get(client) || [];
        if (dsitems1.length !== dsitems2.length) {
            return false;
        }
        for (let i = 0; i < dsitems1.length; i++) {
            const dsitem1 = dsitems1[i];
            const dsitem2 = dsitems2[i];
            if (dsitem1.clock !== dsitem2.clock || dsitem1.len !== dsitem2.len) {
                return false;
            }
        }
    }
    return true;
};
exports.equalSnapshots = equalSnapshots;
