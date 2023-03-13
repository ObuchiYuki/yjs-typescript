import { AbstractType_ } from "./AbstractType_"

import {
    YXmlElement,
    ContentType, Item, YXmlText, YXmlHook, YXmlFragment

} from '../internals'

import * as error from 'lib0/error'
import * as array from 'lib0/array'

/**
 * Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
 * position within them.
 *
 * Can be created with {@link YXmlFragment#createTreeWalker}
 *
 * @public
 * @implements {Iterable<YXmlElement|YXmlText|YXmlElement|YXmlHook>}
 */
export class YXmlTreeWalker {
    _filter: (type: AbstractType_<any>) => boolean
    _root: YXmlFragment | YXmlElement
    _currentNode: Item
    _firstCall: boolean

    constructor(root: YXmlFragment | YXmlElement, f: (type: AbstractType_<any>) => boolean = () => true) {
        this._filter = f
        this._root = root
        this._currentNode = root._start as Item
        this._firstCall = true
    }

    [Symbol.iterator]() {
        return this
    }

    /** Get the next node. */
    next(): IteratorResult<YXmlElement | YXmlText | YXmlHook> {
        let n: Item|null = this._currentNode
        let type = n && n.content && (n.content as any).type
        if (n !== null && (!this._firstCall || n.deleted || !this._filter(type))) { // if first call, we check if we can use the first item
            do {
                type = (n.content as any).type
                if (!n.deleted && (type.constructor === YXmlElement || type.constructor === YXmlFragment) && type._start !== null) {
                    // walk down in the tree
                    n = type._start
                } else {
                    // walk right or up in the tree
                    while (n !== null) {
                        if (n.right !== null) {
                            n = n.right
                            break
                        } else if (n.parent === this._root) {
                            n = null
                        } else {
                            n = (n.parent as AbstractType_<any>)._item
                        }
                    }
                }
            } while (n !== null && (n.deleted || !this._filter((n.content as ContentType).type)))
        }
        this._firstCall = false
        if (n === null) {
            // @ts-ignore
            return { value: undefined, done: true }
        }
        this._currentNode = n
        return { value: (n.content as any).type, done: false }
    }
}
