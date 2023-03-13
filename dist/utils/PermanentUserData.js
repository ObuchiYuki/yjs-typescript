"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermanentUserData = void 0;
const internals_1 = require("../internals");
const decoding = require("lib0/decoding");
class PermanentUserData {
    /**
     * @param {Doc} doc
     * @param {YMap<any>} [storeType]
     */
    constructor(doc, storeType = doc.getMap('users')) {
        const dss = new Map();
        this.yusers = storeType;
        this.doc = doc;
        this.clients = new Map();
        this.dss = dss;
        /**
         * @param {YMap<any>} user
         * @param {string} userDescription
         */
        const initUser = (user, userDescription) => {
            /**
             * @type {YArray<Uint8Array>}
             */
            const ds = user.get('ds');
            const ids = user.get('ids');
            const addClientId = (clientid) => this.clients.set(clientid, userDescription);
            ds.observe((event) => {
                event.changes.added.forEach(item => {
                    item.content.getContent().forEach(encodedDs => {
                        if (encodedDs instanceof Uint8Array) {
                            this.dss.set(userDescription, internals_1.DeleteSet.mergeAll([this.dss.get(userDescription) || new internals_1.DeleteSet(), internals_1.DeleteSet.decode(new internals_1.DSDecoderV1(decoding.createDecoder(encodedDs)))]));
                        }
                    });
                });
            });
            this.dss.set(userDescription, internals_1.DeleteSet.mergeAll(ds.map((encodedDs) => internals_1.DeleteSet.decode(new internals_1.DSDecoderV1(decoding.createDecoder(encodedDs))))));
            ids.observe((event) => event.changes.added.forEach(item => item.content.getContent().forEach(addClientId)));
            ids.forEach(addClientId);
        };
        // observe users
        storeType.observe(event => {
            event.keysChanged.forEach(userDescription => initUser(storeType.get(userDescription), userDescription));
        });
        // add intial data
        storeType.forEach(initUser);
    }
    /**
     * @param {Doc} doc
     * @param {number} clientid
     * @param {string} userDescription
     * @param {Object} conf
     * @param {function(Transaction, DeleteSet):boolean} [conf.filter]
     */
    setUserMapping(doc, clientid, userDescription, { filter = () => true } = {}) {
        const users = this.yusers;
        let user = users.get(userDescription);
        if (!user) {
            user = new internals_1.YMap();
            user.set('ids', new internals_1.YArray());
            user.set('ds', new internals_1.YArray());
            users.set(userDescription, user);
        }
        user.get('ids').push([clientid]);
        users.observe(_event => {
            setTimeout(() => {
                const userOverwrite = users.get(userDescription);
                if (userOverwrite !== user) {
                    // user was overwritten, port all data over to the next user object
                    // @todo Experiment with Y.Sets here
                    user = userOverwrite;
                    // @todo iterate over old type
                    this.clients.forEach((_userDescription, clientid) => {
                        if (userDescription === _userDescription) {
                            user.get('ids').push([clientid]);
                        }
                    });
                    const encoder = new internals_1.DSEncoderV1();
                    const ds = this.dss.get(userDescription);
                    if (ds) {
                        ds.encode(encoder);
                        user.get('ds').push([encoder.toUint8Array()]);
                    }
                }
            }, 0);
        });
        doc.on('afterTransaction', (transaction) => {
            setTimeout(() => {
                const yds = user.get('ds');
                const ds = transaction.deleteSet;
                if (transaction.local && ds.clients.size > 0 && filter(transaction, ds)) {
                    const encoder = new internals_1.DSEncoderV1();
                    ds.encode(encoder);
                    yds.push([encoder.toUint8Array()]);
                }
            });
        });
    }
    /**
     * @param {number} clientid
     * @return {any}
     */
    getUserByClientId(clientid) {
        return this.clients.get(clientid) || null;
    }
    /**
     * @param {ID} id
     * @return {string | null}
     */
    getUserByDeletedId(id) {
        for (const [userDescription, ds] of this.dss.entries()) {
            if (ds.isDeleted(id)) {
                return userDescription;
            }
        }
        return null;
    }
}
exports.PermanentUserData = PermanentUserData;
