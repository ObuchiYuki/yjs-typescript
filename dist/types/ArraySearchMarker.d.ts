import { Item, // eslint-disable-line
AbstractType_ } from '../internals';
export declare class ArraySearchMarker {
    item: Item | null;
    index: number;
    timestamp: number;
    constructor(item: Item | null, index: number);
    static markPosition(markers: ArraySearchMarker[], item: Item, index: number): ArraySearchMarker;
    /**
     * Search marker help us to find positions in the associative array faster.
     * They speed up the process of finding a position without much bookkeeping.
     * A maximum of `maxSearchMarker` objects are created.
     * This function always returns a refreshed marker (updated timestamp)
     */
    static find(yarray: AbstractType_<any>, index: number): ArraySearchMarker | null | undefined;
    /**
     * Update markers when a change happened.
     *
     * This should be called before doing a deletion!
     */
    static updateChanges(markers: ArraySearchMarker[], index: number, len: number): void;
    refreshTimestamp(): void;
    /** This is rather complex so this function is the only thing that should overwrite a marker */
    overwrite(item: Item, index: number): void;
}
