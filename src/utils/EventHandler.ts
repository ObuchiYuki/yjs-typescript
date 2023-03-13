export class EventHandler<T0, T1> {
    handlers: ((v0: T0, v1: T1) => void)[] = []
    
    constructor() { this.handlers = [] }

    addListener(handler: (v0: T0, v1: T1) => void) {
        this.handlers.push(handler)
    }

    removeListener(handler: (v0: T0, v1: T1) => void) {
        const handlers = this.handlers
        const len = handlers.length
        this.handlers = handlers.filter(h => h !== handler)

        if (len === this.handlers.length) {
            console.error('[yjs] Tried to remove event handler that doesn\'t exist.')
        }
    }

    removeAllListeners() {
        this.handlers.length = 0
    }
    
    callListeners(v0: T0, v1: T1) {
        for (const handler of this.handlers) {
            handler(v0, v1)
        }
    }
}
