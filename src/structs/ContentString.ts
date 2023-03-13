import {
    Transaction, Item, StructStore,
    Content_, ContentDecoder_, UpdateEncoderAny_
} from '../internals'

export class ContentString implements Content_ {
    constructor(public str: string) {}

    getLength(): number { return this.str.length }

    getContent(): any[] { return this.str.split('') }

    isCountable(): boolean { return true }

    copy(): ContentString { return new ContentString(this.str) }

    splice(offset: number): ContentString {
        const right = new ContentString(this.str.slice(offset))
        this.str = this.str.slice(0, offset)

        // Prevent encoding invalid documents because of splitting of surrogate pairs: https://github.com/yjs/yjs/issues/248
        const firstCharCode = this.str.charCodeAt(offset - 1)
        if (firstCharCode >= 0xD800 && firstCharCode <= 0xDBFF) {
            // Last character of the left split is the start of a surrogate utf16/ucs2 pair.
            // We don't support splitting of surrogate pairs because this may lead to invalid documents.
            // Replace the invalid character with a unicode replacement character (� / U+FFFD)
            this.str = this.str.slice(0, offset - 1) + '�'
            // replace right as well
            right.str = '�' + right.str.slice(1)
        }
        return right
    }

    mergeWith(right: ContentString): boolean {
        this.str += right.str
        return true
    }

    integrate(transaction: Transaction, item: Item) {}
    
    delete(transaction: Transaction) {}
    
    gc(store: StructStore) {}
    
    write (encoder: UpdateEncoderAny_, offset: number) {
        encoder.writeString(offset === 0 ? this.str : this.str.slice(offset))
    }

    getRef(): number { return 4 }
}

export const readContentString: ContentDecoder_ = decoder => {
    return new ContentString(decoder.readString())
}
