import * as lib0 from 'lib0-typescript'
import { glo } from './global_'

let clientIDTesting = 0

export const generateNewClientID = (): number => {
    if (glo.$__test) {
        clientIDTesting += 1
        return clientIDTesting
    }
    return lib0.random_uint32()
} 

const uuidv4 = (): string => {
    return ([1e7] as any+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c: any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

let docIDTesting = 0

export const generateDocGuid = (): string => {
    if (glo.$__test) {
        docIDTesting += 1
        return docIDTesting.toString()
    }
    return uuidv4()
}