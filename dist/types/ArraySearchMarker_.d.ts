import { Item, // eslint-disable-line
AbstractType_ } from '../internals';
export declare class ArraySearchMarker_ {
    item: Item | null;
    index: number;
    timestamp: number;
    constructor(item: Item | null, index: number);
    /**
    * A unique timestamp that identifies each marker.
    * Time is relative,.. this is more like an ever-increasing clock.
    */
    private static globalSearchMarkerTimestamp;
    private static maxSearchMarker;
    static markPosition(markers: ArraySearchMarker_[], item: Item, index: number): ArraySearchMarker_;
    /**
     * Search marker help us to find positions in the associative array faster.
     * They speed up the process of finding a position without much bookkeeping.
     * A maximum of `maxSearchMarker` objects are created.
     * This function always returns a refreshed marker (updated timestamp)
     */
    static find(yarray: AbstractType_<any>, index: number): ArraySearchMarker_ | null | undefined;
    /**
     * Update markers when a change happened.
     *
     * This should be called before doing a deletion!
     */
    static updateChanges(markers: ArraySearchMarker_[], index: number, len: number): void;
    refreshTimestamp(): void;
    /** This is rather complex so this function is the only thing that should overwrite a marker */
    overwrite(item: Item, index: number): void;
}
