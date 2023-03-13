
import { AbstractType_, Item } from '../../internals' // eslint-disable-line

/**
 * Check if `parent` is a parent of `child`.
 *
 * @param {AbstractType_<any>} parent
 * @param {Item|null} child
 * @return {Boolean} Whether `parent` is a parent of `child`.
 *
 * @private
 * @function
 */
export const isParentOf = (parent: AbstractType_<any>, child: Item | null): boolean => {
    while (child !== null) {
        if (child.parent === parent) {
            return true
        }
        child = (child.parent as AbstractType_<any>)._item
    }
    return false
}
