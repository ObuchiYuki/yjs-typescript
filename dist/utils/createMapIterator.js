"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMapIterator = void 0;
const iterator = require("lib0/iterator");
const createMapIterator = (map) => {
    return iterator.iteratorFilter(map.entries(), (entry) => !entry[1].deleted);
};
exports.createMapIterator = createMapIterator;
