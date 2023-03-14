
import * as Y from '../../src/index'
import * as t from 'lib0/testing'

/**
 * @param {Y.Text} ytext
 */
const checkRelativePositions = (ytext: Y.Text) => {
    // test if all positions are encoded and restored correctly
    for (let i = 0; i < ytext.length; i++) {
        // for all types of associations..
        for (let assoc = -1; assoc < 2; assoc++) {
            const rpos = Y.RelativePosition.fromTypeIndex(ytext, i, assoc)
            const encodedRpos = rpos.encode()
            const decodedRpos = Y.RelativePosition.decode(encodedRpos)
            const absPos = Y.AbsolutePosition.fromRelativePosition(
                decodedRpos, ytext.doc as Y.Doc
            ) as Y.AbsolutePosition
            t.assert(absPos.index === i)
            t.assert(absPos.assoc === assoc)
        }
    }
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionCase1 = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    ytext.insert(0, '1')
    ytext.insert(0, 'abc')
    ytext.insert(0, 'z')
    ytext.insert(0, 'y')
    ytext.insert(0, 'x')
    checkRelativePositions(ytext)
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionCase2 = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    ytext.insert(0, 'abc')
    checkRelativePositions(ytext)
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionCase3 = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    ytext.insert(0, 'abc')
    ytext.insert(0, '1')
    ytext.insert(0, 'xyz')
    checkRelativePositions(ytext)
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionCase4 = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    ytext.insert(0, '1')
    checkRelativePositions(ytext)
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionCase5 = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    ytext.insert(0, '2')
    ytext.insert(0, '1')
    checkRelativePositions(ytext)
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionCase6 = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    checkRelativePositions(ytext)
}

/**
 * @param {t.TestCase} tc
 */
export const testRelativePositionAssociationDifference = (tc: t.TestCase) => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText()
    ytext.insert(0, '2')
    ytext.insert(0, '1')
    const rposRight = Y.RelativePosition.fromTypeIndex(ytext, 1, 0)
    const rposLeft = Y.RelativePosition.fromTypeIndex(ytext, 1, -1)
    ytext.insert(1, 'x')
    const posRight = Y.AbsolutePosition.fromRelativePosition(rposRight, ydoc)
    const posLeft = Y.AbsolutePosition.fromRelativePosition(rposLeft, ydoc)
    t.assert(posRight != null && posRight.index === 2)
    t.assert(posLeft != null && posLeft.index === 1)
}
