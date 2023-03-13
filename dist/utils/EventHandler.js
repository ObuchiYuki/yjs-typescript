"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = void 0;
class EventHandler {
    constructor() {
        this.handlers = [];
        this.handlers = [];
    }
    addListener(handler) {
        this.handlers.push(handler);
    }
    removeListener(handler) {
        const handlers = this.handlers;
        const len = handlers.length;
        this.handlers = handlers.filter(h => h !== handler);
        if (len === this.handlers.length) {
            console.error('[yjs] Tried to remove event handler that doesn\'t exist.');
        }
    }
    removeAllListeners() {
        this.handlers.length = 0;
    }
    callListeners(v0, v1) {
        for (const handler of this.handlers) {
            handler(v0, v1);
        }
    }
}
exports.EventHandler = EventHandler;
