import { AbstractType } from '../internals';
/**
 * Convenient helper to log type information.
 *
 * Do not use in productive systems as the output can be immense!
 *
 * @param {AbstractType<any>} type
 */
export declare const logType: (type: AbstractType<any>) => void;
