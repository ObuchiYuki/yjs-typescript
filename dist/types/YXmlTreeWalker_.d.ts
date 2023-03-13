import { AbstractType_ } from "./AbstractType_";
import { YXmlElement, Item, YXmlText, YXmlHook, YXmlFragment } from '../internals';
/**
 * Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
 * position within them.
 *
 * Can be created with {@link YXmlFragment#createTreeWalker}
 *
 * @public
 * @implements {Iterable<YXmlElement|YXmlText|YXmlElement|YXmlHook>}
 */
export declare class YXmlTreeWalker {
    _filter: (type: AbstractType_<any>) => boolean;
    _root: YXmlFragment | YXmlElement;
    _currentNode: Item;
    _firstCall: boolean;
    constructor(root: YXmlFragment | YXmlElement, f?: (type: AbstractType_<any>) => boolean);
    [Symbol.iterator](): this;
    /** Get the next node. */
    next(): IteratorResult<YXmlElement | YXmlText | YXmlHook>;
}
