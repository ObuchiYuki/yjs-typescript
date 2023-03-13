import { AbstractType_ } from '../../internals';
/**
 * The top types are mapped from y.share.get(keyname) => type.
 * `type` does not store any information about the `keyname`.
 * This function finds the correct `keyname` for `type` and throws otherwise.
 */
export declare const findRootTypeKey: (type: AbstractType_<any>) => string;
