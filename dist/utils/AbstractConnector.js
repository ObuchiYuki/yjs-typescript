"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractConnector = void 0;
const lib0 = require("lib0-typescript");
/**
 * This is an abstract interface that all Connectors should implement to keep them interchangeable.
 *
 * @note This interface is experimental and it is not advised to actually inherit this class.
 *             It just serves as typing information.
 *
 * @extends {Observable<any>}
 */
class AbstractConnector extends lib0.Observable {
    constructor(ydoc, awareness) {
        super();
        this.doc = ydoc;
        this.awareness = awareness;
    }
}
exports.AbstractConnector = AbstractConnector;
