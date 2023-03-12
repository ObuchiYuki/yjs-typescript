/**
 * General event handler implementation.
 *
 * @template ARG0, ARG1
 *
 * @private
 */
export declare class EventHandler<ARG0, ARG1> {
    l: ((arg0: ARG0, arg1: ARG1) => void)[];
    constructor();
}
/**
 * @template ARG0,ARG1
 * @returns {EventHandler<ARG0,ARG1>}
 *
 * @private
 * @function
 */
export declare const createEventHandler: <ARG0, ARG1>() => EventHandler<ARG0, ARG1>;
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
export declare const addEventHandlerListener: <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>, f: (arg0: ARG0, arg1: ARG1) => void) => number;
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
export declare const removeEventHandlerListener: <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>, f: (arg0: ARG0, arg1: ARG1) => void) => void;
/**
 * Removes all event listeners.
 * @template ARG0,ARG1
 * @param {EventHandler<ARG0,ARG1>} eventHandler
 *
 * @private
 * @function
 */
export declare const removeAllEventHandlerListeners: <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>) => void;
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
export declare const callEventHandlerListeners: <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>, arg0: ARG0, arg1: ARG1) => void;
