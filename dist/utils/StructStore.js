"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructStore = void 0;
const internals_1 = require("../internals");
const lib0 = require("lib0-typescript");
class StructStore {
    constructor() {
        this.clients = new Map();
        this.pendingStructs = null;
        this.pendingDs = null;
    }
    /** Return the states as a Map<client,clock>. Note that clock refers to the next expected clock id. */
    getStateVector() {
        const sm = new Map();
        this.clients.forEach((structs, client) => {
            const struct = structs[structs.length - 1];
            sm.set(client, struct.id.clock + struct.length);
        });
        return sm;
    }
    getState(client) {
        const structs = this.clients.get(client);
        if (structs === undefined) {
            return 0;
        }
        const lastStruct = structs[structs.length - 1];
        return lastStruct.id.clock + lastStruct.length;
    }
    integretyCheck() {
        this.clients.forEach(structs => {
            for (let i = 1; i < structs.length; i++) {
                const l = structs[i - 1];
                const r = structs[i];
                if (l.id.clock + l.length !== r.id.clock) {
                    throw new Error('StructStore failed integrety check');
                }
            }
        });
    }
    addStruct(struct) {
        let structs = this.clients.get(struct.id.client);
        if (structs === undefined) {
            structs = [];
            this.clients.set(struct.id.client, structs);
        }
        else {
            const lastStruct = structs[structs.length - 1];
            if (lastStruct.id.clock + lastStruct.length !== struct.id.clock) {
                throw new lib0.UnexpectedCaseError();
            }
        }
        structs.push(struct);
    }
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    find(id) {
        const structs = this.clients.get(id.client);
        return structs[StructStore.findIndexSS(structs, id.clock)];
    }
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    getItem(id) { return this.find(id); }
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    static getItemCleanStart(transaction, id) {
        const structs = transaction.doc.store.clients.get(id.client);
        return structs[this.findIndexCleanStart(transaction, structs, id.clock)];
    }
    /** Expects that id is actually in store. This function throws or is an infinite loop otherwise. */
    getItemCleanEnd(transaction, id) {
        const structs = this.clients.get(id.client);
        const index = StructStore.findIndexSS(structs, id.clock);
        const struct = structs[index];
        if (id.clock !== struct.id.clock + struct.length - 1 && struct.constructor !== internals_1.GC) {
            structs.splice(index + 1, 0, struct.split(transaction, id.clock - struct.id.clock + 1));
        }
        return struct;
    }
    /** Replace `item` with `newitem` in store */
    replaceStruct(struct, newStruct) {
        const structs = this.clients.get(struct.id.client);
        structs[StructStore.findIndexSS(structs, struct.id.clock)] = newStruct;
    }
}
exports.StructStore = StructStore;
_a = StructStore;
/** Iterate over a range of structs */
StructStore.iterateStructs = (transaction, structs, clockStart, len, f) => {
    if (len === 0) {
        return;
    }
    const clockEnd = clockStart + len;
    let index = _a.findIndexCleanStart(transaction, structs, clockStart);
    let struct;
    do {
        struct = structs[index++];
        if (clockEnd < struct.id.clock + struct.length) {
            _a.findIndexCleanStart(transaction, structs, clockEnd);
        }
        f(struct);
    } while (index < structs.length && structs[index].id.clock < clockEnd);
};
/** Perform a binary search on a sorted array */
StructStore.findIndexSS = (structs, clock) => {
    let left = 0;
    let right = structs.length - 1;
    let mid = structs[right];
    let midclock = mid.id.clock;
    if (midclock === clock) {
        return right;
    }
    // @todo does it even make sense to pivot the search?
    // If a good split misses, it might actually increase the time to find the correct item.
    // Currently, the only advantage is that search with pivoting might find the item on the first try.
    let midindex = Math.floor((clock / (midclock + mid.length - 1)) * right); // pivoting the search
    while (left <= right) {
        mid = structs[midindex];
        midclock = mid.id.clock;
        if (midclock <= clock) {
            if (clock < midclock + mid.length) {
                return midindex;
            }
            left = midindex + 1;
        }
        else {
            right = midindex - 1;
        }
        midindex = Math.floor((left + right) / 2);
    }
    // Always check state before looking for a struct in StructStore
    // Therefore the case of not finding a struct is unexpected
    throw new lib0.UnexpectedCaseError();
};
StructStore.findIndexCleanStart = (transaction, structs, clock) => {
    const index = StructStore.findIndexSS(structs, clock);
    const struct = structs[index];
    if (struct.id.clock < clock && struct instanceof internals_1.Item) {
        structs.splice(index + 1, 0, struct.split(transaction, clock - struct.id.clock));
        return index + 1;
    }
    return index;
};
