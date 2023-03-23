"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocGuid = exports.generateNewClientID = void 0;
const lib0 = require("lib0-typescript");
const global_1 = require("./global_");
let clientIDTesting = 0;
const generateNewClientID = () => {
    if (global_1.glo.$__test) {
        clientIDTesting += 1;
        return clientIDTesting;
    }
    return lib0.random_uint32();
};
exports.generateNewClientID = generateNewClientID;
const uuidv4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
};
let docIDTesting = 0;
const generateDocGuid = () => {
    if (global_1.glo.$__test) {
        docIDTesting += 1;
        return docIDTesting.toString();
    }
    return uuidv4();
};
exports.generateDocGuid = generateDocGuid;
