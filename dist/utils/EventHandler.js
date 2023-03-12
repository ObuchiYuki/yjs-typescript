"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callEventHandlerListeners = exports.removeAllEventHandlerListeners = exports.removeEventHandlerListener = exports.addEventHandlerListener = exports.createEventHandler = exports.EventHandler = void 0;
const f = require("lib0/function");
/**
 * General event handler implementation.
 *
 * @template ARG0, ARG1
 *
 * @private
 */
class EventHandler {
    constructor() {
        this.l = [];
        this.l = [];
    }
}
exports.EventHandler = EventHandler;
/**
 * @template ARG0,ARG1
 * @returns {EventHandler<ARG0,ARG1>}
 *
 * @private
 * @function
 */
const createEventHandler = () => new EventHandler();
exports.createEventHandler = createEventHandler;
/**
 * Adds an event listener that is called when
 * {@link EventHandler#callEventListeners} is called.
 *
 * @template ARG0,ARG1
 * @param {EventHandler<ARG0,ARG1>} eventHandler
 * @param {function(ARG0,ARG1):void} f The event handler.
 *
 * @private
 * @function
 */
const addEventHandlerListener = (eventHandler, f) => eventHandler.l.push(f);
exports.addEventHandlerListener = addEventHandlerListener;
/**
 * Removes an event listener.
 *
 * @template ARG0,ARG1
 * @param {EventHandler<ARG0,ARG1>} eventHandler
 * @param {function(ARG0,ARG1):void} f The event handler that was added with
 *                                         {@link EventHandler#addEventListener}
 *
 * @private
 * @function
 */
const removeEventHandlerListener = (eventHandler, f) => {
    const l = eventHandler.l;
    const len = l.length;
    eventHandler.l = l.filter(g => f !== g);
    if (len === eventHandler.l.length) {
        console.error('[yjs] Tried to remove event handler that doesn\'t exist.');
    }
};
exports.removeEventHandlerListener = removeEventHandlerListener;
/**
 * Removes all event listeners.
 * @template ARG0,ARG1
 * @param {EventHandler<ARG0,ARG1>} eventHandler
 *
 * @private
 * @function
 */
const removeAllEventHandlerListeners = (eventHandler) => {
    eventHandler.l.length = 0;
};
exports.removeAllEventHandlerListeners = removeAllEventHandlerListeners;
/**
 * Call all event listeners that were added via
 * {@link EventHandler#addEventListener}.
 *
 * @template ARG0,ARG1
 * @param {EventHandler<ARG0,ARG1>} eventHandler
 * @param {ARG0} arg0
 * @param {ARG1} arg1
 *
 * @private
 * @function
 */
const callEventHandlerListeners = (eventHandler, arg0, arg1) => {
    return f.callAll(eventHandler.l, [arg0, arg1]);
};
exports.callEventHandlerListeners = callEventHandlerListeners;
