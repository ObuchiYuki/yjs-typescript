"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocFromSnapshot = exports.splitSnapshotAffectedStructs = exports.isVisible = exports.snapshot = exports.emptySnapshot = exports.createSnapshot = exports.decodeSnapshot = exports.decodeSnapshotV2 = exports.encodeSnapshot = exports.encodeSnapshotV2 = exports.equalSnapshots = exports.Snapshot = void 0;
const internals_1 = require("../internals");
const map = require("lib0/map");
const set = require("lib0/set");
const decoding = require("lib0/decoding");
const encoding = require("lib0/encoding");
class Snapshot {
    /**
     * @param {DeleteSet} ds
     * @param {Map<number,number>} sv state map
     */
    constructor(ds, sv) {
        this.ds = ds;
        this.sv = sv;
    }
}
exports.Snapshot = Snapshot;
/**
 * @param {Snapshot} snap1
 * @param {Snapshot} snap2
 * @return {boolean}
 */
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
/**
 * @param {Snapshot} snapshot
 * @param {DSEncoderV1 | DSEncoderV2} [encoder]
 * @return {Uint8Array}
 */
const encodeSnapshotV2 = (snapshot, encoder = new internals_1.DSEncoderV2()) => {
    snapshot.ds.encode(encoder);
    (0, internals_1.writeStateVector)(encoder, snapshot.sv);
    return encoder.toUint8Array();
};
exports.encodeSnapshotV2 = encodeSnapshotV2;
/**
 * @param {Snapshot} snapshot
 * @return {Uint8Array}
 */
const encodeSnapshot = (snapshot) => (0, exports.encodeSnapshotV2)(snapshot, new internals_1.DSEncoderV1());
exports.encodeSnapshot = encodeSnapshot;
/**
 * @param {Uint8Array} buf
 * @param {DSDecoderV1 | DSDecoderV2} [decoder]
 * @return {Snapshot}
 */
const decodeSnapshotV2 = (buf, decoder = new internals_1.DSDecoderV2(decoding.createDecoder(buf))) => {
    return new Snapshot(internals_1.DeleteSet.decode(decoder), (0, internals_1.readStateVector)(decoder));
};
exports.decodeSnapshotV2 = decodeSnapshotV2;
/**
 * @param {Uint8Array} buf
 * @return {Snapshot}
 */
const decodeSnapshot = (buf) => (0, exports.decodeSnapshotV2)(buf, new internals_1.DSDecoderV1(decoding.createDecoder(buf)));
exports.decodeSnapshot = decodeSnapshot;
/**
 * @param {DeleteSet} ds
 * @param {Map<number,number>} sm
 * @return {Snapshot}
 */
const createSnapshot = (ds, sm) => new Snapshot(ds, sm);
exports.createSnapshot = createSnapshot;
exports.emptySnapshot = (0, exports.createSnapshot)(new internals_1.DeleteSet(), new Map());
/**
 * @param {Doc} doc
 * @return {Snapshot}
 */
const snapshot = (doc) => (0, exports.createSnapshot)(internals_1.DeleteSet.createFromStructStore(doc.store), (0, internals_1.getStateVector)(doc.store));
exports.snapshot = snapshot;
/**
 * @param {Item} item
 * @param {Snapshot|undefined} snapshot
 *
 * @protected
 * @function
 */
const isVisible = (item, snapshot) => snapshot === undefined
    ? !item.deleted
    : snapshot.sv.has(item.id.client) && (snapshot.sv.get(item.id.client) || 0) > item.id.clock && !snapshot.ds.isDeleted(item.id);
exports.isVisible = isVisible;
/**
 * @param {Transaction} transaction
 * @param {Snapshot} snapshot
 */
const splitSnapshotAffectedStructs = (transaction, snapshot) => {
    const meta = map.setIfUndefined(transaction.meta, exports.splitSnapshotAffectedStructs, set.create);
    const store = transaction.doc.store;
    // check if we already split for this snapshot
    if (!meta.has(snapshot)) {
        snapshot.sv.forEach((clock, client) => {
            if (clock < (0, internals_1.getState)(store, client)) {
                (0, internals_1.getItemCleanStart)(transaction, new internals_1.ID(client, clock));
            }
        });
        snapshot.ds.iterate(transaction, item => { });
        meta.add(snapshot);
    }
};
exports.splitSnapshotAffectedStructs = splitSnapshotAffectedStructs;
/**
 * @param {Doc} originDoc
 * @param {Snapshot} snapshot
 * @param {Doc} [newDoc] Optionally, you may define the Yjs document that receives the data from originDoc
 * @return {Doc}
 */
const createDocFromSnapshot = (originDoc, snapshot, newDoc = new internals_1.Doc()) => {
    if (originDoc.gc) {
        // we should not try to restore a GC-ed document, because some of the restored items might have their content deleted
        throw new Error('originDoc must not be garbage collected');
    }
    const { sv, ds } = snapshot;
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
            if (clock < (0, internals_1.getState)(originDoc.store, client)) {
                (0, internals_1.getItemCleanStart)(transaction, new internals_1.ID(client, clock));
            }
            const structs = originDoc.store.clients.get(client) || [];
            const lastStructIndex = (0, internals_1.findIndexSS)(structs, clock - 1);
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
};
exports.createDocFromSnapshot = createDocFromSnapshot;
