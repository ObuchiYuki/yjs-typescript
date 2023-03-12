
import {
    YEvent,
    YXmlText, YXmlElement, YXmlFragment, Transaction // eslint-disable-line
} from '../internals'

/**
 * @extends YEvent<YXmlElement|YXmlText|YXmlFragment>
 * An Event that describes changes on a YXml Element or Yxml Fragment
 */
export class YXmlEvent extends YEvent<YXmlElement|YXmlText|YXmlFragment> {

    /** Whether the children changed. */
    childListChanged: boolean
    
    /** Set of all changed attributes. */
    attributesChanged: Set<string>

    /**
     * @param {YXmlElement|YXmlText|YXmlFragment} target The target on which the event is created.
     * @param {Set<string|null>} subs The set of changed attributes. `null` is included if the
     *                                     child list changed.
     * @param {Transaction} transaction The transaction instance with wich the
     *                                                                    change was created.
     */
    constructor(target: YXmlElement | YXmlText | YXmlFragment, subs: Set<string | null>, transaction: Transaction) {
        super(target, transaction)
        
        this.childListChanged = false
        this.attributesChanged = new Set()

        subs.forEach((sub) => {
            if (sub === null) {
                this.childListChanged = true
            } else {
                this.attributesChanged.add(sub)
            }
        })
    }
}
