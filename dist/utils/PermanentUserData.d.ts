import { YMap, ID, DeleteSet, Transaction, Doc } from '../internals';
export declare class PermanentUserData {
    yusers: YMap<any>;
    doc: Doc;
    /** Maps from clientid to userDescription */
    clients: Map<number, string>;
    dss: Map<string, DeleteSet>;
    /**
     * @param {Doc} doc
     * @param {YMap<any>} [storeType]
     */
    constructor(doc: Doc, storeType?: YMap<any>);
    /**
     * @param {Doc} doc
     * @param {number} clientid
     * @param {string} userDescription
     * @param {Object} conf
     * @param {function(Transaction, DeleteSet):boolean} [conf.filter]
     */
    setUserMapping(doc: Doc, clientid: number, userDescription: string, { filter }?: {
        filter?: (transaction: Transaction, deleteSet: DeleteSet) => boolean;
    }): void;
    /**
     * @param {number} clientid
     * @return {any}
     */
    getUserByClientId(clientid: number): any;
    /**
     * @param {ID} id
     * @return {string | null}
     */
    getUserByDeletedId(id: ID): string | null;
}
