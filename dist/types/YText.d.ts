import { AbstractType_ } from "./AbstractType_";
import { YEvent, ID, Doc, Item, Snapshot, Transaction, UpdateDecoderAny_, UpdateEncoderAny_, YEventDelta } from '../internals';
export declare class ItemTextListPosition {
    left: Item | null;
    right: Item | null;
    index: number;
    currentAttributes: Map<string, YTextAttributeValue>;
    constructor(left: Item | null, right: Item | null, index: number, currentAttributes: Map<string, YTextAttributeValue>);
    /** Only call this if you know that this.right is defined */
    forward(): void;
    /**
     * @param {Transaction} transaction
     * @param {ItemTextListPosition} pos
     * @param {number} count steps to move forward
     * @return {ItemTextListPosition}
     *
     * @private
     * @function
     */
    findNext(transaction: Transaction, count: number): ItemTextListPosition;
    static find(transaction: Transaction, parent: AbstractType_<any>, index: number): ItemTextListPosition;
}
/**
 * This function is experimental and subject to change / be removed.
 *
 * Ideally, we don't need this function at all. Formatting attributes should be cleaned up
 * automatically after each change. This function iterates twice over the complete YText type
 * and removes unnecessary formatting attributes. This is also helpful for testing.
 *
 * This function won't be exported anymore as soon as there is confidence that the YText type works as intended.
 *
 * @param {YText} type
 * @return {number} How many formatting attributes have been cleaned up.
 */
export declare const cleanupYTextFormatting: (type: YText) => number;
/**
 * The Quill Delta format represents changes on a text document with
 * formatting information. For mor information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
 *
 * @example
 *     {
 *         ops: [
 *             { insert: 'Gandalf', attributes: { bold: true } },
 *             { insert: ' the ' },
 *             { insert: 'Grey', attributes: { color: '#cccccc' } }
 *         ]
 *     }
 *
 */
/**
    * Attributes that can be assigned to a selection of text.
    *
    * @example
    *     {
    *         bold: true,
    *         font-size: '40px'
    *     }
    */
export type YTextAttributeValue = boolean | number | string | object | null | undefined;
export type YTextAttributes = {
    [s: string]: YTextAttributeValue;
};
export type YTextAction = "delete" | "insert" | "retain";
/** Event that describes the changes on a YText type. */
export declare class YTextEvent extends YEvent<YText> {
    /** Whether the children changed. */
    childListChanged: boolean;
    /** Set of all changed attributes. */
    keysChanged: Set<string>;
    /**
     * @param {YText} ytext
     * @param {Transaction} transaction
     * @param {Set<string>} keysChanged The keys that changed
     */
    constructor(ytext: YText, transaction: Transaction, subs: Set<null | string>);
    get changes(): any;
    /**
     * Compute the changes in the delta format.
     * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
     */
    get delta(): YEventDelta[];
}
/**
 * Type that represents text with formatting information.
 *
 * This type replaces y-richtext as this implementation is able to handle
 * block formats (format information on a paragraph), embeds (complex elements
 * like pictures and videos), and text formats (**bold**, *italic*).
 */
export declare class YText extends AbstractType_<YTextEvent> {
    /** Array of pending operations on this type */
    _pending: (() => void)[] | null;
    /**
     * @param {String} [string] The initial value of the YText.
     */
    constructor(string?: string);
    /** Number of characters of this text type. */
    get length(): number;
    _integrate(y: Doc, item: Item): void;
    _copy(): YText;
    clone(): YText;
    /**
     * Creates YTextEvent and calls observers.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, parentSubs: Set<null | string>): void;
    /** Returns the unformatted string representation of this YText type. */
    toString(): string;
    /**Returns the unformatted string representation of this YText type. */
    toJSON(): string;
    /**
     * Apply a {@link Delta} on this shared YText type.
     *
     * @param {any} delta The changes to apply on this element.
     * @param {object}    opts
     * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
     *
     *
     * @public
     */
    applyDelta(delta: any, { sanitize }?: {
        sanitize?: boolean;
    }): void;
    /** Returns the Delta representation of this YText type. */
    toDelta(snapshot?: Snapshot, prevSnapshot?: Snapshot, computeYChange?: (action: 'removed' | 'added', id: ID) => any): YEventDelta[];
    /**
     * Insert text at a given index.
     *
     * @param {number} index The index at which to start inserting.
     * @param {String} text The text to insert at the specified position.
     * @param {YTextAttributes} [attributes] Optionally define some formatting
     *                                                                        information to apply on the inserted
     *                                                                        Text.
     * @public
     */
    insert(index: number, text: string, attributes?: YTextAttributes): void;
    /**
     * Inserts an embed at a index.
     *
     * @param {number} index The index to insert the embed at.
     * @param {Object | AbstractType_<any>} embed The Object that represents the embed.
     * @param {YTextAttributes} attributes Attribute information to apply on the
     *                                                                        embed
     *
     * @public
     */
    insertEmbed(index: number, embed: object | AbstractType_<any>, attributes?: YTextAttributes): void;
    /**
     * Deletes text starting from an index.
     *
     * @param {number} index Index at which to start deleting.
     * @param {number} length The number of characters to remove. Defaults to 1.
     *
     * @public
     */
    delete(index: number, length: number): void;
    /**
     * Assigns properties to a range of text.
     *
     * @param {number} index The position where to start formatting.
     * @param {number} length The amount of characters to assign properties to.
     * @param {YTextAttributes} attributes Attribute information to apply on the
     *                                                                        text.
     *
     * @public
     */
    format(index: number, length: number, attributes: YTextAttributes): void;
    /**
     * Removes an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    removeAttribute(attributeName: string): void;
    /**
     * Sets or updates an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be set.
     * @param {any} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    setAttribute(attributeName: string, attributeValue: any): void;
    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that identifies the
     *                                                             queried value.
     * @return {any} The queried attribute value.
     *
     * @public
     */
    getAttribute(attributeName: string): any;
    /**
     * Returns all attribute name/value pairs in a JSON Object.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @return {Object<string, any>} A JSON Object that describes the attributes.
     *
     * @public
     */
    getAttributes(): {
        [s: string]: any;
    };
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     */
    _write(encoder: UpdateEncoderAny_): void;
}
/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YText}
 *
 * @private
 * @function
 */
export declare const readYText: (_decoder: UpdateDecoderAny_) => YText;
