import * as doc from './cases/doc.tests'
import * as compatibility from './cases/compatibility.tests'
import * as encoding from './cases/encoding.tests'
import * as relativePositions from './cases/relativePositions.tests'
import * as undoredo from './cases/undo-redo.tests'
import * as updates from './cases/updates.tests'

import * as map from './cases/y-map.tests'
import * as array from './cases/y-array.tests'
import * as text from './cases/y-text.tests'
import * as xml from './cases/y-xml.tests'
import * as snapshot from './cases/snapshot.tests'

import { runTests } from 'lib0/testing'
import { isBrowser, isNode } from 'lib0/environment'
import * as log from 'lib0/logging'
import { UpdateEncoderV1, writeStructs } from '../src/internals'

if (isBrowser) {
    log.createVConsole(document.body)
}
runTests({ 
    doc, 
    compatibility,
    encoding,
    relativePositions,
    undoredo,
    updates,
    map,
    array,
    text,
    xml,
    snapshot
}).then(success => {
    if (isNode) { process.exit(success ? 0 : 1) }
})
