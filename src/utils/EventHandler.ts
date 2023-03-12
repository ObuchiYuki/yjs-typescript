import * as f from 'lib0/function'

/**
 * General event handler implementation.
 *
 * @template ARG0, ARG1
 *
 * @private
 */
export class EventHandler<ARG0, ARG1> {
    l: ((arg0: ARG0, arg1: ARG1) => void)[] = []
    
    constructor() { this.l = [] }
}

/**
 * @template ARG0,ARG1
 * @returns {EventHandler<ARG0,ARG1>}
 *
 * @private
 * @function
 */
export const createEventHandler = <ARG0, ARG1>(): EventHandler<ARG0, ARG1> => new EventHandler()

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
export const addEventHandlerListener = <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>, f: (arg0: ARG0, arg1: ARG1) => void) =>
    eventHandler.l.push(f)

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
export const removeEventHandlerListener = <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>, f: (arg0: ARG0, arg1: ARG1) => void) => {
    const l = eventHandler.l
    const len = l.length
    eventHandler.l = l.filter(g => f !== g)
    if (len === eventHandler.l.length) {
        console.error('[yjs] Tried to remove event handler that doesn\'t exist.')
    }
}

/**
 * Removes all event listeners.
 * @template ARG0,ARG1
 * @param {EventHandler<ARG0,ARG1>} eventHandler
 *
 * @private
 * @function
 */
export const removeAllEventHandlerListeners = <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>) => {
    eventHandler.l.length = 0
}

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
export const callEventHandlerListeners = <ARG0, ARG1>(eventHandler: EventHandler<ARG0, ARG1>, arg0: ARG0, arg1: ARG1) => {
    return f.callAll(eventHandler.l, [arg0, arg1])
}
