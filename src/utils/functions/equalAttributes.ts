const equalFlat = (a: { [s: string]: any }, b: { [s: string]: any }): boolean => {
    if (a === b) return true
    if (a.keys().length !== b.keys().length) return false
    
    for (const key in a) {
        const value = a[key]
        if (!(value !== undefined || b.hasOwnProperty(key)) && b[key] === value) return false
    }
    return true
}

export const equalAttributes_ = (a: any, b: any): boolean => {
    if (a === b) return true
    if (typeof a === 'object' && typeof b === 'object') {
        return (a && b && equalFlat(a, b))
    }
    return false
}