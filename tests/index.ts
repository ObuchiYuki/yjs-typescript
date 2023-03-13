import * as doc from './doc.tests'
import * as compatibility from './compatibility.tests'
import * as encoding from './encoding.tests'
import * as relativePositions from './relativePositions.tests'

// import * as map from './y-map.tests.js'
// import * as array from './y-array.tests.js'
// import * as text from './y-text.tests.js'
// import * as xml from './y-xml.tests.js'
// import * as undoredo from './undo-redo.tests.js'
// import * as snapshot from './snapshot.tests.js'
// import * as updates from './updates.tests.js'


import { runTests } from 'lib0/testing'
import { isBrowser, isNode } from 'lib0/environment'
import * as log from 'lib0/logging'

if (isBrowser) {
    log.createVConsole(document.body)
}
runTests({ 
    doc, 
    compatibility,
    encoding,
    relativePositions
}).then(success => {
    if (isNode) { process.exit(success ? 0 : 1) }
})
