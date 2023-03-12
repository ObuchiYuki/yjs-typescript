import { AbstractType, Item } from '../internals';
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
export declare const isParentOf: (parent: AbstractType<any>, child: Item | null) => boolean;
