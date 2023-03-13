import { AbstractType_, Item } from '../../internals';
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
export declare const isParentOf: (parent: AbstractType_<any>, child: Item | null) => boolean;
