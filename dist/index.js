"use strict";
/** eslint-env browser */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractConnector = exports.PermanentUserData = exports.equalSnapshots = exports.decodeUpdateV2 = exports.decodeUpdate = exports.logUpdateV2 = exports.logUpdate = exports.decodeStateVector = exports.UndoManager = exports.encodeStateVector = exports.encodeStateAsUpdateV2 = exports.encodeStateAsUpdate = exports.readUpdateV2 = exports.readUpdate = exports.applyUpdateV2 = exports.applyUpdate = exports.findRootTypeKey = exports.cleanupYTextFormatting = exports.Snapshot = exports.compareIDs = exports.ID = exports.RelativePosition = exports.AbsolutePosition = exports.compareRelativePositions = exports.AbstractType_ = exports.ContentType = exports.ContentString = exports.ContentAny = exports.ContentJSON = exports.ContentFormat = exports.ContentEmbed = exports.ContentDeleted = exports.ContentBinary = exports.GC = exports.Struct_ = exports.Item = exports.YEvent = exports.YTextEvent = exports.YArrayEvent = exports.YMapEvent = exports.YXmlEvent = exports.XmlFragment = exports.XmlElement = exports.XmlHook = exports.XmlText = exports.Text = exports.Map = exports.Array = exports.Transaction = exports.Doc = void 0;
exports.DeleteSet = exports.UpdateEncoderV1 = exports.convertUpdateFormatV2ToV1 = exports.convertUpdateFormatV1ToV2 = exports.diffUpdateV2 = exports.diffUpdate = exports.encodeStateVectorFromUpdateV2 = exports.encodeStateVectorFromUpdate = exports.parseUpdateMetaV2 = exports.parseUpdateMeta = exports.mergeUpdatesV2 = exports.mergeUpdates = void 0;
var internals_1 = require("./internals");
Object.defineProperty(exports, "Doc", { enumerable: true, get: function () { return internals_1.Doc; } });
Object.defineProperty(exports, "Transaction", { enumerable: true, get: function () { return internals_1.Transaction; } });
Object.defineProperty(exports, "Array", { enumerable: true, get: function () { return internals_1.YArray; } });
Object.defineProperty(exports, "Map", { enumerable: true, get: function () { return internals_1.YMap; } });
Object.defineProperty(exports, "Text", { enumerable: true, get: function () { return internals_1.YText; } });
Object.defineProperty(exports, "XmlText", { enumerable: true, get: function () { return internals_1.YXmlText; } });
Object.defineProperty(exports, "XmlHook", { enumerable: true, get: function () { return internals_1.YXmlHook; } });
Object.defineProperty(exports, "XmlElement", { enumerable: true, get: function () { return internals_1.YXmlElement; } });
Object.defineProperty(exports, "XmlFragment", { enumerable: true, get: function () { return internals_1.YXmlFragment; } });
Object.defineProperty(exports, "YXmlEvent", { enumerable: true, get: function () { return internals_1.YXmlEvent; } });
Object.defineProperty(exports, "YMapEvent", { enumerable: true, get: function () { return internals_1.YMapEvent; } });
Object.defineProperty(exports, "YArrayEvent", { enumerable: true, get: function () { return internals_1.YArrayEvent; } });
Object.defineProperty(exports, "YTextEvent", { enumerable: true, get: function () { return internals_1.YTextEvent; } });
Object.defineProperty(exports, "YEvent", { enumerable: true, get: function () { return internals_1.YEvent; } });
Object.defineProperty(exports, "Item", { enumerable: true, get: function () { return internals_1.Item; } });
Object.defineProperty(exports, "Struct_", { enumerable: true, get: function () { return internals_1.Struct_; } });
Object.defineProperty(exports, "GC", { enumerable: true, get: function () { return internals_1.GC; } });
Object.defineProperty(exports, "ContentBinary", { enumerable: true, get: function () { return internals_1.ContentBinary; } });
Object.defineProperty(exports, "ContentDeleted", { enumerable: true, get: function () { return internals_1.ContentDeleted; } });
Object.defineProperty(exports, "ContentEmbed", { enumerable: true, get: function () { return internals_1.ContentEmbed; } });
Object.defineProperty(exports, "ContentFormat", { enumerable: true, get: function () { return internals_1.ContentFormat; } });
Object.defineProperty(exports, "ContentJSON", { enumerable: true, get: function () { return internals_1.ContentJSON; } });
Object.defineProperty(exports, "ContentAny", { enumerable: true, get: function () { return internals_1.ContentAny; } });
Object.defineProperty(exports, "ContentString", { enumerable: true, get: function () { return internals_1.ContentString; } });
Object.defineProperty(exports, "ContentType", { enumerable: true, get: function () { return internals_1.ContentType; } });
Object.defineProperty(exports, "AbstractType_", { enumerable: true, get: function () { return internals_1.AbstractType_; } });
Object.defineProperty(exports, "compareRelativePositions", { enumerable: true, get: function () { return internals_1.compareRelativePositions; } });
Object.defineProperty(exports, "AbsolutePosition", { enumerable: true, get: function () { return internals_1.AbsolutePosition; } });
Object.defineProperty(exports, "RelativePosition", { enumerable: true, get: function () { return internals_1.RelativePosition; } });
Object.defineProperty(exports, "ID", { enumerable: true, get: function () { return internals_1.ID; } });
Object.defineProperty(exports, "compareIDs", { enumerable: true, get: function () { return internals_1.compareIDs; } });
Object.defineProperty(exports, "Snapshot", { enumerable: true, get: function () { return internals_1.Snapshot; } });
Object.defineProperty(exports, "cleanupYTextFormatting", { enumerable: true, get: function () { return internals_1.cleanupYTextFormatting; } });
Object.defineProperty(exports, "findRootTypeKey", { enumerable: true, get: function () { return internals_1.findRootTypeKey; } });
Object.defineProperty(exports, "applyUpdate", { enumerable: true, get: function () { return internals_1.applyUpdate; } });
Object.defineProperty(exports, "applyUpdateV2", { enumerable: true, get: function () { return internals_1.applyUpdateV2; } });
Object.defineProperty(exports, "readUpdate", { enumerable: true, get: function () { return internals_1.readUpdate; } });
Object.defineProperty(exports, "readUpdateV2", { enumerable: true, get: function () { return internals_1.readUpdateV2; } });
Object.defineProperty(exports, "encodeStateAsUpdate", { enumerable: true, get: function () { return internals_1.encodeStateAsUpdate; } });
Object.defineProperty(exports, "encodeStateAsUpdateV2", { enumerable: true, get: function () { return internals_1.encodeStateAsUpdateV2; } });
Object.defineProperty(exports, "encodeStateVector", { enumerable: true, get: function () { return internals_1.encodeStateVector; } });
Object.defineProperty(exports, "UndoManager", { enumerable: true, get: function () { return internals_1.UndoManager; } });
Object.defineProperty(exports, "decodeStateVector", { enumerable: true, get: function () { return internals_1.decodeStateVector; } });
Object.defineProperty(exports, "logUpdate", { enumerable: true, get: function () { return internals_1.logUpdate; } });
Object.defineProperty(exports, "logUpdateV2", { enumerable: true, get: function () { return internals_1.logUpdateV2; } });
Object.defineProperty(exports, "decodeUpdate", { enumerable: true, get: function () { return internals_1.decodeUpdate; } });
Object.defineProperty(exports, "decodeUpdateV2", { enumerable: true, get: function () { return internals_1.decodeUpdateV2; } });
Object.defineProperty(exports, "equalSnapshots", { enumerable: true, get: function () { return internals_1.equalSnapshots; } });
Object.defineProperty(exports, "PermanentUserData", { enumerable: true, get: function () { return internals_1.PermanentUserData; } });
Object.defineProperty(exports, "AbstractConnector", { enumerable: true, get: function () { return internals_1.AbstractConnector; } });
Object.defineProperty(exports, "mergeUpdates", { enumerable: true, get: function () { return internals_1.mergeUpdates; } });
Object.defineProperty(exports, "mergeUpdatesV2", { enumerable: true, get: function () { return internals_1.mergeUpdatesV2; } });
Object.defineProperty(exports, "parseUpdateMeta", { enumerable: true, get: function () { return internals_1.parseUpdateMeta; } });
Object.defineProperty(exports, "parseUpdateMetaV2", { enumerable: true, get: function () { return internals_1.parseUpdateMetaV2; } });
Object.defineProperty(exports, "encodeStateVectorFromUpdate", { enumerable: true, get: function () { return internals_1.encodeStateVectorFromUpdate; } });
Object.defineProperty(exports, "encodeStateVectorFromUpdateV2", { enumerable: true, get: function () { return internals_1.encodeStateVectorFromUpdateV2; } });
Object.defineProperty(exports, "diffUpdate", { enumerable: true, get: function () { return internals_1.diffUpdate; } });
Object.defineProperty(exports, "diffUpdateV2", { enumerable: true, get: function () { return internals_1.diffUpdateV2; } });
Object.defineProperty(exports, "convertUpdateFormatV1ToV2", { enumerable: true, get: function () { return internals_1.convertUpdateFormatV1ToV2; } });
Object.defineProperty(exports, "convertUpdateFormatV2ToV1", { enumerable: true, get: function () { return internals_1.convertUpdateFormatV2ToV1; } });
Object.defineProperty(exports, "UpdateEncoderV1", { enumerable: true, get: function () { return internals_1.UpdateEncoderV1; } });
Object.defineProperty(exports, "DeleteSet", { enumerable: true, get: function () { return internals_1.DeleteSet; } });
const glo = (typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined' ? global : {});
const importIdentifier = '__ $YJS$ __';
if (glo[importIdentifier] === true) {
    /**
     * Dear reader of this message. Please take this seriously.
     *
     * If you see this message, make sure that you only import one version of Yjs. In many cases,
     * your package manager installs two versions of Yjs that are used by different packages within your project.
     * Another reason for this message is that some parts of your project use the commonjs version of Yjs
     * and others use the EcmaScript version of Yjs.
     *
     * This often leads to issues that are hard to debug. We often need to perform constructor checks,
     * e.g. `struct instanceof GC`. If you imported different versions of Yjs, it is impossible for us to
     * do the constructor checks anymore - which might break the CRDT algorithm.
     *
     * https://github.com/yjs/yjs/issues/438
     */
    console.error('Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438');
}
glo[importIdentifier] = true;
