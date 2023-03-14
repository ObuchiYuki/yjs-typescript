import { Doc } from '../internals';
import * as lib0 from "lib0-typescript";
/**
 * This is an abstract interface that all Connectors should implement to keep them interchangeable.
 *
 * @note This interface is experimental and it is not advised to actually inherit this class.
 *             It just serves as typing information.
 */
export interface Connector_<Message extends {
    [s: string]: unknown[];
}> extends lib0.Observable<Message> {
    doc: Doc;
    awareness: any;
}
