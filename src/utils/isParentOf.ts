
import { AbstractType, Item } from '../internals' // eslint-disable-line

/**
 * Check if `parent` is a parent of `child`.
 *
 * @param {AbstractType<any>} parent
 * @param {Item|null} child
 * @return {Boolean} Whether `parent` is a parent of `child`.
 *
 * @private
 * @function
 */
export const isParentOf = (parent: AbstractType<any>, child: Item | null): boolean => {
    while (child !== null) {
        if (child.parent === parent) {
            return true
        }
        child = (child.parent as AbstractType<any>)._item
    }
    return false
}
