import * as lib0 from "lib0-typescript";
import { Doc } from '../internals';
/**
 * This is an abstract interface that all Connectors should implement to keep them interchangeable.
 *
 * @note This interface is experimental and it is not advised to actually inherit this class.
 *             It just serves as typing information.
 *
 * @extends {Observable<any>}
 */
export declare class AbstractConnector<Message extends {
    [s: string]: readonly unknown[];
}> extends lib0.Observable<Message> {
    doc: Doc;
    awareness: any;
    constructor(ydoc: Doc, awareness: any);
}
