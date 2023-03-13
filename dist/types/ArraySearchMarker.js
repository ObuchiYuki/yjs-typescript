"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArraySearchMarker = void 0;
const maxSearchMarker = 80;
/**
 * A unique timestamp that identifies each marker.
 *
 * Time is relative,.. this is more like an ever-increasing clock.
 */
let globalSearchMarkerTimestamp = 0;
class ArraySearchMarker {
    constructor(item, index) {
        this.item = item;
        this.index = index;
        if (item) {
            item.marker = true;
        }
        this.timestamp = globalSearchMarkerTimestamp++;
    }
    static markPosition(markers, item, index) {
        if (markers.length >= maxSearchMarker) {
            // override oldest marker (we don't want to create more objects)
            const marker = markers.reduce((a, b) => a.timestamp < b.timestamp ? a : b);
            marker.overwrite(item, index);
            return marker;
        }
        else {
            // create new marker
            const pm = new ArraySearchMarker(item, index);
            markers.push(pm);
            return pm;
        }
    }
    /**
     * Search marker help us to find positions in the associative array faster.
     * They speed up the process of finding a position without much bookkeeping.
     * A maximum of `maxSearchMarker` objects are created.
     * This function always returns a refreshed marker (updated timestamp)
     */
    static find(yarray, index) {
        if (yarray._start === null || index === 0 || yarray._searchMarker === null) {
            return null;
        }
        const marker = yarray._searchMarker.length === 0 ? null : yarray._searchMarker.reduce((a, b) => Math.abs(index - a.index) < Math.abs(index - b.index) ? a : b);
        let item = yarray._start;
        let pindex = 0;
        if (marker !== null) {
            item = marker.item;
            pindex = marker.index;
            marker.refreshTimestamp(); // we used it, we might need to use it again
        }
        // iterate to right if possible
        while ((item === null || item === void 0 ? void 0 : item.right) != null && pindex < index) {
            if (!item.deleted && item.countable) {
                if (index < pindex + item.length) {
                    break;
                }
                pindex += item.length;
            }
            item = item.right;
        }
        // iterate to left if necessary (might be that pindex > index)
        while ((item === null || item === void 0 ? void 0 : item.left) != null && pindex > index) {
            item = item.left;
            if (!item.deleted && item.countable) {
                pindex -= item.length;
            }
        }
        // we want to make sure that p can't be merged with left, because that would screw up everything
        // in that cas just return what we have (it is most likely the best marker anyway)
        // iterate to left until p can't be merged with left
        while ((item === null || item === void 0 ? void 0 : item.left) != null && item.left.id.client === item.id.client && item.left.id.clock + item.left.length === item.id.clock) {
            item = item.left;
            if (!item.deleted && item.countable) {
                pindex -= item.length;
            }
        }
        if (item != null)
            if (marker != null && Math.abs(marker.index - pindex) < item.parent.length / maxSearchMarker) {
                // adjust existing marker
                marker.overwrite(item, pindex);
                return marker;
            }
            else {
                // create new marker
                return ArraySearchMarker.markPosition(yarray._searchMarker, item, pindex);
            }
    }
    /**
     * Update markers when a change happened.
     *
     * This should be called before doing a deletion!
     */
    static updateChanges(markers, index, len) {
        for (let i = markers.length - 1; i >= 0; i--) {
            const m = markers[i];
            if (len > 0) {
                let item = m.item;
                if (item)
                    item.marker = false;
                // Ideally we just want to do a simple position comparison, but this will only work if
                // search markers don't point to deleted items for formats.
                // Iterate marker to prev undeleted countable position so we know what to do when updating a position
                while (item && (item.deleted || !item.countable)) {
                    item = item.left;
                    if (item && !item.deleted && item.countable) {
                        // adjust position. the loop should break now
                        m.index -= item.length;
                    }
                }
                if (item === null || item.marker === true) {
                    // remove search marker if updated position is null or if position is already marked
                    markers.splice(i, 1);
                    continue;
                }
                m.item = item;
                item.marker = true;
            }
            if (index < m.index || (len > 0 && index === m.index)) { // a simple index <= m.index check would actually suffice
                m.index = Math.max(index, m.index + len);
            }
        }
    }
    refreshTimestamp() {
        this.timestamp = globalSearchMarkerTimestamp++;
    }
    /** This is rather complex so this function is the only thing that should overwrite a marker */
    overwrite(item, index) {
        if (this.item)
            this.item.marker = false;
        this.item = item;
        item.marker = true;
        this.index = index;
        this.timestamp = globalSearchMarkerTimestamp++;
    }
}
exports.ArraySearchMarker = ArraySearchMarker;
