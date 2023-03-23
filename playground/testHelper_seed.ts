import * as Y from '../src/index'
import * as t from 'lib0/testing'
import * as lib0 from "lib0-typescript"
import * as syncProtocol from '../tests/sync'
import * as object from 'lib0/object'
import * as map from 'lib0/map'

import { glo } from '../src/utils/functions/global_'
import { RandomGenerator } from './RandomGenerator'
glo.$__test = true

const broadcastMessage = (y: TestYInstance, m: Uint8Array) => {
    if (y.tc.onlineConns.has(y)) {
        y.tc.onlineConns.forEach(remoteYInstance => {
            if (remoteYInstance !== y) {
                remoteYInstance._receive(m, y)
            }
        })
    }
}

export let useV2 = false

export const encV1 = {
    encodeStateAsUpdate: Y.encodeStateAsUpdate,
    mergeUpdates: Y.mergeUpdates,
    applyUpdate: Y.applyUpdate,
    logUpdate: Y.logUpdate,
    updateEventName: 'update',
    diffUpdate: Y.diffUpdate
}

export const encV2 = {
    encodeStateAsUpdate: Y.encodeStateAsUpdateV2,
    mergeUpdates: Y.mergeUpdatesV2,
    applyUpdate: Y.applyUpdateV2,
    logUpdate: Y.logUpdateV2,
    updateEventName: 'updateV2',
    diffUpdate: Y.diffUpdateV2
}

export let enc = encV1

const useV1Encoding = () => {
    useV2 = false
    enc = encV1
}

const useV2Encoding = () => {
    // console.error('sync protocol doesnt support v2 protocol yet, fallback to v1 encoding') // @Todo
    useV2 = false
    enc = encV1
}

export class TestYInstance extends Y.Doc {
    tc: TestConnector
    userID: number
    receiving: Map<TestYInstance, Uint8Array[]>
    updates: Uint8Array[]
    
    constructor(testConnector: TestConnector, clientID: number) {
        super()
        this.userID = clientID 
        this.tc = testConnector
        this.receiving = new Map()
        testConnector.allConns.add(this)
        this.updates = []
        this.on(enc.updateEventName as "update"|"updateV2", (update: Uint8Array, origin: any) => {
            if (origin !== testConnector) {
                const encoder = new lib0.Encoder()
                syncProtocol.writeUpdate(encoder, update)
                broadcastMessage(this, encoder.toUint8Array())
            }
            this.updates.push(update)
        })
        this.connect()
    }


    disconnect() {
        this.receiving = new Map()
        this.tc.onlineConns.delete(this)
    }

    /**
     * Append yourself to the list of known Y instances in testconnector.
     * Also initiate sync with all clients.
     */
    connect() {
        if (!this.tc.onlineConns.has(this)) {
            this.tc.onlineConns.add(this)
            const encoder = new lib0.Encoder()
            syncProtocol.writeSyncStep1(encoder, this)
            // publish SyncStep1
            broadcastMessage(this, encoder.toUint8Array())
            this.tc.onlineConns.forEach(remoteYInstance => {
                if (remoteYInstance !== this) {
                    // remote instance sends instance to this instance
                    const encoder = new lib0.Encoder()
                    syncProtocol.writeSyncStep1(encoder, remoteYInstance)
                    this._receive(encoder.toUint8Array(), remoteYInstance)
                }
            })
        }
    }

    _receive(message: Uint8Array, remoteClient: TestYInstance) {
        map.setIfUndefined(this.receiving, remoteClient, () => [] as Uint8Array[]).push(message)
    }
}

export class TestConnector {
    allConns: Set<TestYInstance>
    onlineConns: Set<TestYInstance>
    gen: RandomGenerator
    
    constructor(gen: RandomGenerator) {
        this.allConns = new Set()
        this.onlineConns = new Set()
        this.gen = gen
    }

    createY(clientID: number) {
        return new TestYInstance(this, clientID)
    }

    flushRandomMessage(): boolean {
        const conns = Array.from(this.onlineConns).filter(conn => conn.receiving.size > 0)

        if (conns.length <= 0) { return false }

        const receiver = conns.sort((a, b) => a.clientID - b.clientID)[0]

        const [sender, messages] = Array.from(receiver.receiving.entries())
            .sort(([doc1], [doc2]) => {
                return doc1.clientID - doc2.clientID
            })[0]

        const m = messages.shift()
        if (messages.length === 0) {
            receiver.receiving.delete(sender)
        }
        if (m === undefined) {
            return this.flushRandomMessage()
        }
        const encoder = new lib0.Encoder()

        syncProtocol.readSyncMessage(new lib0.Decoder(m), encoder, receiver, receiver.tc)
        if (encoder.length > 0) {
            sender._receive(encoder.toUint8Array(), receiver)
        }
        return true    
    }

    flushAllMessages(): boolean {
        let didSomething = false
        while (this.flushRandomMessage()) {
            didSomething = true
        }
        return didSomething
    }

    reconnectAll() {
        this.allConns.forEach(conn => conn.connect())
    }

    disconnectAll() {
        this.allConns.forEach(conn => conn.disconnect())
    }

    syncAll() {
        this.reconnectAll()
        this.flushAllMessages()
    }

    disconnectRandom(): boolean {
        if (this.onlineConns.size === 0) {
            return false
        }
        this.gen.oneOf(Array.from(this.onlineConns).sort((a, b) => a.clientID - b.clientID)).disconnect()
        return true
    }

    reconnectRandom(): boolean {
        const reconnectable: Array<TestYInstance> = []
        Array.from(this.allConns).sort((a, b) => a.clientID - b.clientID).forEach(conn => {
            if (!this.onlineConns.has(conn)) {
                reconnectable.push(conn)
            }
        })
        if (reconnectable.length === 0) {
            return false
        }
        this.gen.oneOf(reconnectable).connect()
        return true
    }
}

export const init = <T>(
    tc: t.TestCase,
    gen: RandomGenerator = new RandomGenerator(0),
    { users = 5 }: { users?: number } = {},
    initTestObject?: InitTestObjectCallback<T>
): {
    testObjects: Array<any>;
    testConnector: TestConnector;
    users: Array<TestYInstance>;
    array0: Y.Array<any>;
    array1: Y.Array<any>;
    array2: Y.Array<any>;
    map0: Y.Map<any>;
    map1: Y.Map<any>;
    map2: Y.Map<any>;
    map3: Y.Map<any>;
    text0: Y.Text;
    text1: Y.Text;
    text2: Y.Text;
    xml0: Y.XmlElement;
    xml1: Y.XmlElement;
    xml2: Y.XmlElement;
} => {
    const result: { [s: string]: any } = {
        users: [],
    };

    const testConnector = new TestConnector(gen);
    result.testConnector = testConnector;
    for (let i = 0; i < users; i++) {
        const y = testConnector.createY(i);
        y.clientID = i;
        result.users.push(y);
        result["array" + i] = y.getArray("array");
        result["map" + i] = y.getMap("map");
        result["xml" + i] = y.get("xml", Y.XmlElement);
        result["text" + i] = y.getText("text");
    }
    testConnector.syncAll();
    result.testObjects = result.users.map(initTestObject || (() => null));

    return result as any;
};

export const compare = (users: Array<TestYInstance>) => {
    users.forEach(u => u.connect())
    while (users[0].tc.flushAllMessages()) {}
    
    const mergedDocs = users.map(user => {
        const ydoc = new Y.Doc()
        const update = enc.mergeUpdates(user.updates)
        
        enc.applyUpdate(ydoc, update)
        return ydoc
    })
    users.push(...(mergedDocs as any))
    const userArrayValues = users.map(u => u.getArray('array').toJSON())
    const userMapValues = users.map(u => u.getMap('map').toJSON())
    const userXmlValues = users.map(u => u.get('xml', Y.XmlElement).toString())
    const userTextValues = users.map(u => u.getText('text').toDelta())
    for (const u of users) {
        t.assert(u.store.pendingDs === null)
        t.assert(u.store.pendingStructs === null)
    }
    // Test Array iterator
    t.compare(users[0].getArray('array').toArray(), Array.from(users[0].getArray('array')))
    // Test Map iterator
    const ymapkeys = Array.from(users[0].getMap('map').keys())
    t.assert(ymapkeys.length === Object.keys(userMapValues[0]).length)
    ymapkeys.forEach(key => t.assert(object.hasProperty(userMapValues[0], key)))
    
    const mapRes: { [s: string]: any } = {}
    for (const [k, v] of users[0].getMap('map')) {
        mapRes[k] = v instanceof Y.AbstractType_ ? v.toJSON() : v
    }
    t.compare(userMapValues[0], mapRes)
    
    // Compare all users
    for (let i = 0; i < users.length - 1; i++) {
        t.compare(userArrayValues[i].length, users[i].getArray('array').length)
        t.compare(userArrayValues[i], userArrayValues[i + 1])
        t.compare(userMapValues[i], userMapValues[i + 1])
        t.compare(userXmlValues[i], userXmlValues[i + 1])
        t.compare(userTextValues[i].map(/** @param {any} a */ (a: any) => typeof a.insert === 'string' ? a.insert : ' ').join('').length, users[i].getText('text').length)
        t.compare(userTextValues[i], userTextValues[i + 1], '', (_constructor, a, b) => {
            if (a instanceof Y.AbstractType_ && b instanceof Y.AbstractType_) {
                t.compare(a.toJSON(), b.toJSON())
            } else if (a !== b) {
                t.fail('Deltas dont match')
            }
            return true
        })
        t.compare(Y.encodeStateVector(users[i]), Y.encodeStateVector(users[i + 1]))
        compareDS(Y.DeleteSet.createFromStructStore(users[i].store), Y.DeleteSet.createFromStructStore(users[i + 1].store))
        compareStructStores(users[i].store, users[i + 1].store)
    }
    users.map(u => u.destroy())
}

export const compareItemIDs = (a: Y.Item | null, b: Y.Item | null): boolean => a === b || (a !== null && b != null && Y.compareIDs(a.id, b.id))

export const compareStructStores = (ss1: import('../src/internals.js').StructStore, ss2: import('../src/internals.js').StructStore) => {
    t.assert(ss1.clients.size === ss2.clients.size)
    for (const [client, structs1] of ss1.clients) {
        const structs2 = ss2.clients.get(client) as Y.Struct_[]
        t.assert(structs2 !== undefined && structs1.length === structs2.length)
        for (let i = 0; i < structs1.length; i++) {
            const s1 = structs1[i]
            const s2 = structs2[i]
            // checks for abstract struct
            if (
                s1.constructor !== s2.constructor ||
                !Y.compareIDs(s1.id, s2.id) ||
                s1.deleted !== s2.deleted ||
                // @ts-ignore
                s1.length !== s2.length
            ) {
                t.fail('Structs dont match')
            }
            if (s1 instanceof Y.Item) {
                if (
                    !(s2 instanceof Y.Item) ||
                    !((s1.left === null && s2.left === null) || (s1.left !== null && s2.left !== null && Y.compareIDs(s1.left.lastID, s2.left.lastID))) ||
                    !compareItemIDs(s1.right, s2.right) ||
                    !Y.compareIDs(s1.origin, s2.origin) ||
                    !Y.compareIDs(s1.rightOrigin, s2.rightOrigin) ||
                    s1.parentSub !== s2.parentSub
                ) {
                    return t.fail('Items dont match')
                }
                // make sure that items are connected correctly
                t.assert(s1.left === null || s1.left.right === s1)
                t.assert(s1.right === null || s1.right.left === s1)
                t.assert(s2.left === null || s2.left.right === s2)
                t.assert(s2.right === null || s2.right.left === s2)
            }
        }
    }
}

export const compareDS = (ds1: import('../src/internals.js').DeleteSet, ds2: import('../src/internals.js').DeleteSet) => {
    t.assert(ds1.clients.size === ds2.clients.size)
    ds1.clients.forEach((deleteItems1, client) => {
        const deleteItems2 = (ds2.clients.get(client)) as (import('../src/internals.js').DeleteItem)[]
        t.assert(deleteItems2 !== undefined && deleteItems1.length === deleteItems2.length)
        for (let i = 0; i < deleteItems1.length; i++) {
            const di1 = deleteItems1[i]
            const di2 = deleteItems2[i]
            if (di1.clock !== di2.clock || di1.len !== di2.len) {
                t.fail('DeleteSets dont match')
            }
        }
    })
}

type InitTestObjectCallback<T> = (y: TestYInstance) => T

export const applyRandomTests = <T>(tc: t.TestCase, gen: RandomGenerator, mods: Array<((doc: Y.Doc, gen: RandomGenerator, obj: T) => void)>, iterations: number) => {
    const result = init(tc, gen, { users: 5 })
    const { testConnector, users } = result
    for (let i = 0; i < iterations; i++) {
        if (gen.int32(0, 100) <= 2) {
            // 2% chance to disconnect/reconnect a random user
            if (gen.bool()) {
                testConnector.disconnectRandom()
            } else {
                testConnector.reconnectRandom()
            }
        } else if (gen.int32(0, 100) <= 1) {
            // 1% chance to flush all
            testConnector.flushAllMessages()
        } else if (gen.int32(0, 100) <= 50) {
            // 50% chance to flush a random message
            testConnector.flushRandomMessage()
        }
        const user = gen.int32(0, users.length - 1)
        const test = gen.oneOf(mods)
        test(users[user], gen, result.testObjects[user])
    }
    compare(users)
    return result
}

