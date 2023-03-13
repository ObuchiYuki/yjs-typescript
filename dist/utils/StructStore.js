"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iterateStructs = exports.replaceStruct = exports.getItemCleanEnd = exports.getItemCleanStart = exports.findIndexCleanStart = exports.getItem = exports.find = exports.findIndexSS = exports.addStruct = exports.integretyCheck = exports.getState = exports.getStateVector = exports.StructStore = void 0;
const internals_1 = require("../internals");
const math = require("lib0/math");
const error = require("lib0/error");
class StructStore {
    constructor() {
        this.clients = new Map();
        this.pendingStructs = null;
        this.pendingDs = null;
    }
}
exports.StructStore = StructStore;
/**
 * Return the states as a Map<client,clock>.
 * Note that clock refers to the next expected clock id.
 *
 * @param {StructStore} store
 * @return {Map<number,number>}
 *
 * @public
 * @function
 */
const getStateVector = (store) => {
    const sm = new Map();
    store.clients.forEach((structs, client) => {
        const struct = structs[structs.length - 1];
        sm.set(client, struct.id.clock + struct.length);
    });
    return sm;
};
exports.getStateVector = getStateVector;
/**
 * @param {StructStore} store
 * @param {number} client
 * @return {number}
 *
 * @public
 * @function
 */
const getState = (store, client) => {
    const structs = store.clients.get(client);
    if (structs === undefined) {
        return 0;
    }
    const lastStruct = structs[structs.length - 1];
    return lastStruct.id.clock + lastStruct.length;
};
exports.getState = getState;
/**
 * @param {StructStore} store
 *
 * @private
 * @function
 */
const integretyCheck = (store) => {
    store.clients.forEach(structs => {
        for (let i = 1; i < structs.length; i++) {
            const l = structs[i - 1];
            const r = structs[i];
            if (l.id.clock + l.length !== r.id.clock) {
                throw new Error('StructStore failed integrety check');
            }
        }
    });
};
exports.integretyCheck = integretyCheck;
/**
 * @param {StructStore} store
 * @param {GC|Item} struct
 *
 * @private
 * @function
 */
const addStruct = (store, struct) => {
    let structs = store.clients.get(struct.id.client);
    if (structs === undefined) {
        structs = [];
        store.clients.set(struct.id.client, structs);
    }
    else {
        const lastStruct = structs[structs.length - 1];
        if (lastStruct.id.clock + lastStruct.length !== struct.id.clock) {
            throw error.unexpectedCase();
        }
    }
    structs.push(struct);
};
exports.addStruct = addStruct;
/**
 * Perform a binary search on a sorted array
 * @param {Array<Item|GC>} structs
 * @param {number} clock
 * @return {number}
 *
 * @private
 * @function
 */
const findIndexSS = (structs, clock) => {
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
    let midindex = math.floor((clock / (midclock + mid.length - 1)) * right); // pivoting the search
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
        midindex = math.floor((left + right) / 2);
    }
    // Always check state before looking for a struct in StructStore
    // Therefore the case of not finding a struct is unexpected
    throw error.unexpectedCase();
};
exports.findIndexSS = findIndexSS;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 *
 * @param {StructStore} store
 * @param {ID} id
 * @return {GC|Item}
 *
 * @private
 * @function
 */
const find = (store, id) => {
    const structs = store.clients.get(id.client);
    return structs[(0, exports.findIndexSS)(structs, id.clock)];
};
exports.find = find;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 * @private
 * @function
 */
const getItem = (store, id) => {
    return (0, exports.find)(store, id);
};
exports.getItem = getItem;
/**
 * @param {Transaction} transaction
 * @param {Array<Item|GC>} structs
 * @param {number} clock
 */
const findIndexCleanStart = (transaction, structs, clock) => {
    const index = (0, exports.findIndexSS)(structs, clock);
    const struct = structs[index];
    if (struct.id.clock < clock && struct instanceof internals_1.Item) {
        structs.splice(index + 1, 0, struct.split(transaction, clock - struct.id.clock));
        return index + 1;
    }
    return index;
};
exports.findIndexCleanStart = findIndexCleanStart;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 *
 * @param {Transaction} transaction
 * @param {ID} id
 * @return {Item}
 *
 * @private
 * @function
 */
const getItemCleanStart = (transaction, id) => {
    const structs = transaction.doc.store.clients.get(id.client);
    return structs[(0, exports.findIndexCleanStart)(transaction, structs, id.clock)];
};
exports.getItemCleanStart = getItemCleanStart;
/**
 * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
 *
 * @param {Transaction} transaction
 * @param {StructStore} store
 * @param {ID} id
 * @return {Item}
 *
 * @private
 * @function
 */
const getItemCleanEnd = (transaction, store, id) => {
    const structs = store.clients.get(id.client);
    const index = (0, exports.findIndexSS)(structs, id.clock);
    const struct = structs[index];
    if (id.clock !== struct.id.clock + struct.length - 1 && struct.constructor !== internals_1.GC) {
        structs.splice(index + 1, 0, struct.split(transaction, id.clock - struct.id.clock + 1));
    }
    return struct;
};
exports.getItemCleanEnd = getItemCleanEnd;
/**
 * Replace `item` with `newitem` in store
 * @param {StructStore} store
 * @param {GC|Item} struct
 * @param {GC|Item} newStruct
 *
 * @private
 * @function
 */
const replaceStruct = (store, struct, newStruct) => {
    const structs = store.clients.get(struct.id.client);
    structs[(0, exports.findIndexSS)(structs, struct.id.clock)] = newStruct;
};
exports.replaceStruct = replaceStruct;
/**
 * Iterate over a range of structs
 *
 * @param {Transaction} transaction
 * @param {Array<Item|GC>} structs
 * @param {number} clockStart Inclusive start
 * @param {number} len
 * @param {function(GC|Item):void} f
 *
 * @function
 */
const iterateStructs = (transaction, structs, clockStart, len, f) => {
    if (len === 0) {
        return;
    }
    const clockEnd = clockStart + len;
    let index = (0, exports.findIndexCleanStart)(transaction, structs, clockStart);
    let struct;
    do {
        struct = structs[index++];
        if (clockEnd < struct.id.clock + struct.length) {
            (0, exports.findIndexCleanStart)(transaction, structs, clockEnd);
        }
        f(struct);
    } while (index < structs.length && structs[index].id.clock < clockEnd);
};
exports.iterateStructs = iterateStructs;
