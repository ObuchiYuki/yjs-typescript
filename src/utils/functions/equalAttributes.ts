import * as object from 'lib0/object'

export const equalAttributes_ = (a: any, b: any): boolean => {
    if (a === b) return true
    if (typeof a === 'object' && typeof b === 'object') {
        return (a && b && object.equalFlat(a, b))
    }
    return false
}