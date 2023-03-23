
import {
    YArray,
    YMap,
    DSEncoderV1, DSDecoderV1, ID, DeleteSet, YArrayEvent, Transaction, Doc, // eslint-disable-line
} from '../internals'

import * as lib0 from 'lib0-typescript'

export class PermanentUserData {
    yusers: YMap<any>
    doc: Doc

    /** Maps from clientid to userDescription */
    clients: Map<number, string>

    dss: Map<string, DeleteSet>

    /**
     * @param {Doc} doc
     * @param {YMap<any>} [storeType]
     */
    constructor(doc: Doc, storeType: YMap<any> = doc.getMap('users')) {
        const dss = new Map<string,DeleteSet>()
        this.yusers = storeType
        this.doc = doc
        this.clients = new Map()
        this.dss = dss
        /**
         * @param {YMap<any>} user
         * @param {string} userDescription
         */
        const initUser = (user: YMap<any>, userDescription: string) => {
            const ds = user.get('ds') as YArray<Uint8Array>
            const ids = user.get('ids')
            const addClientId = (clientid: number) => this.clients.set(clientid, userDescription)
            ds.observe((event: YArrayEvent<any>) => {
                event.changes.added.forEach(item => {
                    item.content.getContent().forEach(encodedDs => {
                        if (encodedDs instanceof Uint8Array) {
                            this.dss.set(userDescription, DeleteSet.mergeAll([this.dss.get(userDescription) || new DeleteSet(), DeleteSet.decode(new DSDecoderV1(new lib0.Decoder(encodedDs)))]))
                        }
                    })
                })
            })
            this.dss.set(userDescription, DeleteSet.mergeAll(ds.map((encodedDs: Uint8Array) => DeleteSet.decode(new DSDecoderV1(new lib0.Decoder(encodedDs))))))
            ids.observe((event: YArrayEvent<any>) =>
                event.changes.added.forEach(item => item.content.getContent().forEach(addClientId))
            )
            ids.forEach(addClientId)
        }
        // observe users
        storeType.observe(event => {
            event.keysChanged.forEach(userDescription =>
                initUser(storeType.get(userDescription), userDescription)
            )
        })
        // add intial data
        storeType.forEach(initUser)
    }

    /**
     * @param {Doc} doc
     * @param {number} clientid
     * @param {string} userDescription
     * @param {Object} conf
     * @param {function(Transaction, DeleteSet):boolean} [conf.filter]
     */
    setUserMapping(doc: Doc, clientid: number, userDescription: string,
        { filter = () => true }: { filter?: (transaction: Transaction, deleteSet: DeleteSet) => boolean } = {}
    ) {
        const users = this.yusers
        let user = users.get(userDescription)
        if (!user) {
            user = new YMap()
            user.set('ids', new YArray())
            user.set('ds', new YArray())
            users.set(userDescription, user)
        }
        user.get('ids').push([clientid])
        users.observe(_event => {
            setTimeout(() => {
                const userOverwrite = users.get(userDescription)
                if (userOverwrite !== user) {
                    // user was overwritten, port all data over to the next user object
                    // @todo Experiment with Y.Sets here
                    user = userOverwrite
                    // @todo iterate over old type
                    this.clients.forEach((_userDescription, clientid) => {
                        if (userDescription === _userDescription) {
                            user.get('ids').push([clientid])
                        }
                    })
                    const encoder = new DSEncoderV1()
                    const ds = this.dss.get(userDescription)
                    if (ds) {
                        ds.encode(encoder)
                        user.get('ds').push([encoder.toUint8Array()])
                    }
                }
            }, 0)
        })
        doc.on('afterTransaction', (transaction: Transaction) => {
            setTimeout(() => {
                const yds = user.get('ds')
                const ds = transaction.deleteSet
                if (transaction.local && ds.clients.size > 0 && filter(transaction, ds)) {
                    const encoder = new DSEncoderV1()
                    ds.encode(encoder)
                    yds.push([encoder.toUint8Array()])
                }
            })
        })
    }

    /**
     * @param {number} clientid
     * @return {any}
     */
    getUserByClientId(clientid: number): any {
        return this.clients.get(clientid) || null
    }

    /**
     * @param {ID} id
     * @return {string | null}
     */
    getUserByDeletedId(id: ID): string | null {
        for (const [userDescription, ds] of this.dss.entries()) {
            if (ds.isDeleted(id)) {
                return userDescription
            }
        }
        return null
    }
}
