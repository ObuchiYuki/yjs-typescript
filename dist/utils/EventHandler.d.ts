export declare class EventHandler<T0, T1> {
    handlers: ((v0: T0, v1: T1) => void)[];
    constructor();
    addListener(handler: (v0: T0, v1: T1) => void): void;
    removeListener(handler: (v0: T0, v1: T1) => void): void;
    removeAllListeners(): void;
    callListeners(v0: T0, v1: T1): void;
}
