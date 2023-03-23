"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glo = void 0;
exports.glo = (typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined' ? global : {});
