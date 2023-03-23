export const glo: GlobalThis = (typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined' ? global : {}) as any

interface GlobalThis {
  $__test?: boolean
  [s: string]: any
}