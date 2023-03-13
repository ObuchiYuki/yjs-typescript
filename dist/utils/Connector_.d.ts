import { Observable } from 'lib0/observable';
import { Doc } from '../internals';
/**
 * This is an abstract interface that all Connectors should implement to keep them interchangeable.
 *
 * @note This interface is experimental and it is not advised to actually inherit this class.
 *             It just serves as typing information.
 *
 * @extends {Observable<any>}
 */
export interface Connector_ extends Observable<any> {
    doc: Doc;
    awareness: any;
}
