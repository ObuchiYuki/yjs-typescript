
import {
    AbstractType_ // eslint-disable-line
} from '../../internals'

/**
 * Convenient helper to log type information.
 *
 * Do not use in productive systems as the output can be immense!
 *
 * @param {AbstractType_<any>} type
 */
export const logType = (type: AbstractType_<any>) => {
    const res = []
    let n = type._start
    while (n) {
        res.push(n)
        n = n.right
    }
    console.log('Children: ', res)
    console.log('Children content: ', res.filter(m => !m.deleted).map(m => m.content))
}
