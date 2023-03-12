"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractConnector = void 0;
const observable_1 = require("lib0/observable");
/**
 * This is an abstract interface that all Connectors should implement to keep them interchangeable.
 *
 * @note This interface is experimental and it is not advised to actually inherit this class.
 *             It just serves as typing information.
 *
 * @extends {Observable<any>}
 */
class AbstractConnector extends observable_1.Observable {
    constructor(ydoc, awareness) {
        super();
        this.doc = ydoc;
        this.awareness = awareness;
    }
}
exports.AbstractConnector = AbstractConnector;
