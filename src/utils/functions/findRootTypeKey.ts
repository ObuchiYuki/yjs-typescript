
import {
    AbstractType_
} from '../../internals'

import * as error from 'lib0/error'

/**
 * The top types are mapped from y.share.get(keyname) => type.
 * `type` does not store any information about the `keyname`.
 * This function finds the correct `keyname` for `type` and throws otherwise.
 */
export const findRootTypeKey = (type: AbstractType_<any>): string => {
    for (const [key, value] of type.doc!.share.entries()) {
        if (value === type) {
            return key
        }
    }
    throw error.unexpectedCase()
}
