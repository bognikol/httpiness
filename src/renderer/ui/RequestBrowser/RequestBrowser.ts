import { Br, Div, typeAflonTarget, Span } from "aflon";

import { HttpCollection, CollectionOpeningError, HttpReqt, HttpRequestMethod, HttpTextBody, HttpBodyContentType } from "../../lib/http";
import { Postman2dot1CollectionConverter } from "../../lib/interop/collections/Postman2dot1CollectionConverter";
import { error }                           from "../../lib/Logger";
import { ConversionError, IThirdPartyCollectionConverter } from "../../lib/interop/collections/IThirdPartyCollectionConverter";
import { showOpenDialog, showSaveDialog } from "../../lib/SystemDialogs";

import { Colors, FontStyles }    from "../StyleConstants";
import { AppStatePersister }     from "../AppStatePersister";
import { IconButton }            from "../IconButton";
import { SimpleModals } from "../Modals";

import { BrowserRequestItem }    from "./BrowserRequestItem";
import { BrowserCollectionItem } from "./BrowserCollectionItem";
import { BrowserDirItem }        from "./BrowserDirItem";
import { BrowserAuthItem }       from "./BrowserAuthItem";

export class RequestBrowser extends Div {
    private static _saveInterval = 5000;

    public eventItemSelected         = "itemSelected";
    public eventItemPinSelected      = "itemPinSelected";
    public eventItemAboutToBeDeleted = "itemAboutToBeDeleted";
    public eventReqtSendRequested    = "reqtSendRequested";
    public eventClosingCollection    = "closingCollection";

    private _header: Div;
    private _title: Div;
    private _content: Div;
    private _placeholder: Div;
    private _importIcon: IconButton;
    private _newFileIcon: IconButton;
    private _experimentIcon: IconButton;

    private _saveTimer: NodeJS.Timeout;
    private _externallyModifiedCollections: Array<BrowserCollectionItem> = [];
    private _externalModificationPromptShown: boolean = false;

    constructor() {
        super();

        this.append([
            (this._header = new Div())
                .append([
                    (this._title = new Div())
                        .setText("Request Browser"),
                    (this._importIcon = new IconButton("import"))
                        .setTooltip("Import httpiness or third-party collection")
                        .on("click", () => this._onImportButtonClick()),
                    (this._newFileIcon = new IconButton("new-file"))
                        .setTooltip("Create new collection")
                        .on("click", () => this._onNewCollectionButtonClick()),
                    (this._experimentIcon = new IconButton("experiment"))
                        .setTooltip("Experiment. Show local collection for experimenting with requests. " +
                                    "This special collection is not stored in file and cannot be shared.")
                        .on("click", () => this.importLSExpCollection())
                ]),
            (this._content = new Div()),
            (this._placeholder = new Div())
                .append([
                    new Span().setText("There are no collections opened."),
                    new Br(),
                    new Span().setText("To get started, "),
                    new Span()
                        .setText("import")
                        .setInlineCss({ fontWeight: "bold", cursor: "pointer", textDecoration: "underline" })
                        .on("click", () => this._onImportButtonClick()),
                    new Span().setText(" existing collection or "),
                    new Span()
                        .setText("create")
                        .setInlineCss({ fontWeight: "bold", cursor: "pointer", textDecoration: "underline" })
                        .on("click", () => this._onNewCollectionButtonClick()),
                    new Span().setText(" new one.")
                ])
        ]);

        this._loadStoredCollections();
        this._updatePlaceholderVisibility();

        this._saveTimer = setInterval(() => this._onSaveTimeout(), RequestBrowser._saveInterval);
        window.addEventListener("beforeunload", this._onBeforeUnload);
    }

    createCollection(): void {
        this._onNewCollectionButtonClick();
    }

    importCollection(): void {
        this._onImportButtonClick();
    }

    importLSExpCollection(): void {
        this._importCollection(HttpCollection.localStorageExpCollectionPath);
    }

    loadSampleRequest(): void {
        let experimentalCollectionItem = this._content.children()
            .filter(child => child instanceof BrowserCollectionItem)
            .map(item => <BrowserCollectionItem>item)
            .find(item => item.getCollection().isLocalExperimental());

        let experimentalCollection: HttpCollection = null;

        if (experimentalCollectionItem) {
            experimentalCollection = experimentalCollectionItem.getCollection();
            this._closeCollection(experimentalCollectionItem);
        } else {
            const cff = HttpCollection.fromFile(HttpCollection.localStorageExpCollectionPath);
            if (cff.error != CollectionOpeningError.Success) return;
            experimentalCollection = cff.collection;
        }

        let sampleRequest = experimentalCollection.getReqts()
            .find(reqt => reqt.getName() == "Sample request");

        if (!sampleRequest) {
            let body = new HttpTextBody();
            body.value = "{ \"message\": \"Hello world from ${HTTPINESS}!\" }";
            body.valueType = HttpBodyContentType.Text;

            sampleRequest =
                new HttpReqt()
                    .setName("Sample request")
                    .setMethod(HttpRequestMethod.POST)
                    .setUrl("https://www.httpbin.org/anything")
                    .setHeaders([ { name: "Content-Type", value: "application/json" } ])
                    .setBody(body);

            experimentalCollection.addReqt(sampleRequest);
            experimentalCollection.setMacro("HTTPINESS", "httpiness", false);
        }

        let newCollectionItem = new BrowserCollectionItem(experimentalCollection);
        this._attachEventHandlers(newCollectionItem);
        this._content.prepend([ newCollectionItem ]);
        newCollectionItem.setExpanded(true);

        this._updateOpenCollectionsCache();
        this._updatePlaceholderVisibility();

        this.raise(this.eventItemPinSelected, {
            item: sampleRequest
        });
    }

    reportReqtSendRequested(reqt: HttpReqt): void {
        this.raise(this.eventReqtSendRequested, { item: reqt });
    }

    private _updatePlaceholderVisibility(): void {
        if (this._content.getChildrenNumber() == 0) {
            this._content.setVisibility(false);
            this._placeholder.setVisibility(true);
        } else {
            this._content.setVisibility(true);
            this._placeholder.setVisibility(false);
        }
    }

    private async _promptUserForExternallyModifiedCollections(): Promise<void> {
        if (this._externalModificationPromptShown) return;
        if (this._externallyModifiedCollections.length == 0) return;

        this._externalModificationPromptShown = true;

        let result = await SimpleModals.choose(
            `Some collection files have been modified outside httpiness.
            
            How would you like to resolve conflicts?`,
            [
                { text: "Reload collections from modified files", id: "reload", default: true },
                { text: "Discard changes in modified files", id: "discard" }
            ]
        );

        if (result == "reload") {
            this._externallyModifiedCollections.forEach(collection => this._reloadCollection(collection));
        } else if (result == "discard") {
            this._externallyModifiedCollections.forEach(collection => collection.getCollection().save());
        }

        this._externalModificationPromptShown= false;
        this._externallyModifiedCollections = [];
    }

    private _saveCollections(): void {
        this._content.children().forEach(child => {
            if (!(child instanceof BrowserCollectionItem)) return;

            let collectionItem = <BrowserCollectionItem>child;

            if (collectionItem.getCollection().isModifiedExternally()) {
                if (!this._externallyModifiedCollections.includes(collectionItem))
                    this._externallyModifiedCollections.push(collectionItem);
            } else if (collectionItem.getCollection().isDirty())
                collectionItem.getCollection().save();
        });
    }

    private _updateOpenCollectionsCache(): void {
        let openCollections: Array<string> = [];

        this._content.children().forEach(child => {
            if (!(child instanceof BrowserCollectionItem)) return;
            let collectionItem = <BrowserCollectionItem>child;
            openCollections.push(collectionItem.getCollection().getFilePath());
        });

        AppStatePersister.setOpenedCollections(openCollections);
    }

    private _loadStoredCollections(): void {
        try {
            let rawCollectionPaths: Array<string> = AppStatePersister.getOpenedCollections();

            if (!rawCollectionPaths.length) return;

            let collections: Array<BrowserCollectionItem> = [];

            rawCollectionPaths.forEach(path => {
                if (!HttpCollection.isValidPath(path)) return;

                const result = HttpCollection.fromFile(path);
                if (result.error != CollectionOpeningError.Success) return;

                let newCollectionItem = new BrowserCollectionItem(result.collection);
                this._attachEventHandlers(newCollectionItem);

                collections.push(newCollectionItem);
            });

            this._content.append(collections);

            setTimeout(() => {
                AppStatePersister.getOpenedWItems().reverse().forEach(record => {
                    let targetCollection = collections.find(collection => collection.getCollection().getUuid() == record.collectionUuid);
                    if (!targetCollection) return;

                    let item = targetCollection.getCollection().findFromAbsolutePath(record.path);
                    if (!item) return;

                    if (record.pinned)
                        this.raise(this.eventItemPinSelected, { item });
                    else
                        this.raise(this.eventItemSelected, { item });
                });
            }, 0);
        } catch (ex) {
            error(`There was an error loading previously opened collections: ${ex}`, {error: ex as Error});
            this._content.empty();
        }
    }

    private _reloadCollection(collectionItem: BrowserCollectionItem): void {
        this.raise(this.eventClosingCollection, {
            collection: collectionItem.getCollection()
        });

        this._removeEventHandlers(collectionItem);

        let path = collectionItem.getCollection().getFilePath();

        if (!HttpCollection.isValidPath(path)) return;

        const result = HttpCollection.fromFile(path);
        if (result.error != CollectionOpeningError.Success) return;

        let newCollectionItem = new BrowserCollectionItem(result.collection);
        this._attachEventHandlers(newCollectionItem);

        collectionItem.insertAfter(newCollectionItem);
        this._content.removeChild(collectionItem);
    }

    private async _tryThirdPartyCollectionConversion(pathToCollection: string): Promise<HttpCollection> {
        const convertor: IThirdPartyCollectionConverter = new Postman2dot1CollectionConverter(pathToCollection);
        const result = convertor.convert();

        if (result.error != ConversionError.Success) {
            await SimpleModals.alert(`There was an error opening and converting third-party collection ${pathToCollection}.`);
            return null;
        }

        if (result.notSupported.size == 0) {
            await SimpleModals.alert("Conversion of third-party collection has been successful. " +
            "Where would you like to save converted httpiness collection?", "Browse");
        } else {
            let skipped = "";
            result.notSupported.forEach(feature => skipped += " " + feature + ",");
            skipped = skipped.slice(0, -1);


            await SimpleModals.alert("Conversion of third-party collection has been successful, " +
            "but some features might have been skipped because httpiness does not support them yet. " +
            "These features are:" + skipped + ".\n\n" +
            "Where would you like to save converted httpiness collection?", "Browse");
        }

        const sfdResult = await showSaveDialog({
            title: "Save converted httpiness collection...",
            filters: [{ name: "httpiness JSON Collection", extensions: ["json"] }],
            properties: [ "createDirectory", "showOverwriteConfirmation" ]
        });

        if (sfdResult.canceled) return null;

        const sResult = convertor.save(sfdResult.filePath, sfdResult.filePath + ".conversion.log");

        if (!sResult) {
            await SimpleModals.alert("There was an error saving converted collection.");
            return null;
        }

        const cff = HttpCollection.fromFile(sfdResult.filePath);

        if (cff.error != CollectionOpeningError.Success) {
            await SimpleModals.alert("There was an error opening converted collection.");
            return null;
        }

        return cff.collection;
    }

    private async _onImportButtonClick(): Promise<void> {
        const result = await showOpenDialog({
            title: "Open collection file...",
            filters: [{ name: "httpiness or third-party JSON Collection", extensions: ["json"] }],
            properties: [ "openFile", "createDirectory" ]
        });

        if (result.canceled) return;

        await this._importCollection(result.filePaths[0]);
    }

    private async _importCollection(pathToCollection: string): Promise<void> {
        let collection = null;
        const cff = HttpCollection.fromFile(pathToCollection);

        if (cff.error == CollectionOpeningError.Success) {
            collection = cff.collection;
        } else if (cff.error == CollectionOpeningError.UnknownError) {
            await SimpleModals.alert(`There was an error opening httpiness collection ${pathToCollection}. ` +
            "Collection file might be corrupted.");
            return;
        } else if (cff.error == CollectionOpeningError.UnsupportedVersion) {
            await SimpleModals.alert(`There was an error opening httpiness collection ${pathToCollection}. ` +
            "Collection schema is not supported. Please download latest version of httpiness and try again.");
            return;
        } else if (cff.error == CollectionOpeningError.UnknownVersion) {
            collection = await this._tryThirdPartyCollectionConversion(pathToCollection);
        } else {
            throw new Error(`Cannot handle CollectionFromFileError ${cff.error}.`);
        }

        if (collection == null) return;

        let indexOfAlreadyImportedCollection = this._content.children()
            .filter(child => child instanceof BrowserCollectionItem)
            .map(item => (<BrowserCollectionItem>item).getCollection())
            .findIndex(col => col.getFilePath() == collection.getFilePath());

        if (indexOfAlreadyImportedCollection != -1) {
            await SimpleModals.alert("Cannot import collection because it has already been imported.");
            return;
        }

        let newCollectionItem = new BrowserCollectionItem(collection);
        this._attachEventHandlers(newCollectionItem);

        if (collection.isLocalExperimental()) {
            this._content.prepend([newCollectionItem]);
        } else {
            this._content.append([newCollectionItem]);
        }

        newCollectionItem.setExpanded(true);

        this._updateOpenCollectionsCache();
        this._updatePlaceholderVisibility();
    }

    private async _onNewCollectionButtonClick(): Promise<void> {
        const result = await showSaveDialog({
            title: "Create new collection...",
            filters: [{ name: "httpiness JSON Collection", extensions: ["json"] }],
            properties: [ "createDirectory", "showOverwriteConfirmation" ]
        });

        if (result.canceled) return;

        let collectionResult = HttpCollection.fromFile(result.filePath);
        if (collectionResult.error != CollectionOpeningError.Success) return;

        let newCollectionItem = new BrowserCollectionItem(collectionResult.collection);
        this._attachEventHandlers(newCollectionItem);
        this._content.append([newCollectionItem]);

        this._updateOpenCollectionsCache();
        this._updatePlaceholderVisibility();
    }

    private _attachEventHandlers(collectionItem: BrowserCollectionItem): void {
        collectionItem
            .on(collectionItem.eventRequestSelected, this._onRequestSelected)
            .on(collectionItem.eventRequestPinSelected, this._onRequestPinSelected)
            .on(collectionItem.eventCloseRequested, this._onCloseRequested)
            .on(collectionItem.eventItemAboutToBeDeleted, this._onItemAboutToBeDeleted)
            .on(collectionItem.eventAuthSelected, this._onAuthSelected)
            .on(collectionItem.eventAuthPinSelected, this._onAuthPinSelected);
    }

    private _removeEventHandlers(collectionItem: BrowserCollectionItem): void {
        collectionItem
            .off(collectionItem.eventRequestSelected, this._onRequestSelected)
            .off(collectionItem.eventRequestPinSelected, this._onRequestPinSelected)
            .off(collectionItem.eventCloseRequested, this._onCloseRequested)
            .off(collectionItem.eventItemAboutToBeDeleted, this._onItemAboutToBeDeleted)
            .off(collectionItem.eventAuthSelected, this._onAuthSelected)
            .off(collectionItem.eventAuthPinSelected, this._onAuthPinSelected);
    }

    private _closeCollection(collectionItem: BrowserCollectionItem): void {
        this.raise(this.eventClosingCollection, {
            collection: collectionItem.getCollection()
        });

        this._removeEventHandlers(collectionItem);
        this._content.removeChild(collectionItem);
        this._updateOpenCollectionsCache();
        this._updatePlaceholderVisibility();

        collectionItem.getCollection().save();
    }

    private _onRequestSelected = (e: Event): void => {
        this.raise(this.eventItemSelected, {
            item: (<BrowserRequestItem>e["detail"]["request"]).getHttpReqt(),
            makeWorkspaceNameEditable: (<boolean>e["detail"]["makeNameEditable"])
        });
    };

    private _onRequestPinSelected = (e: Event): void => {
        this.raise(this.eventItemPinSelected, {
            item: (<BrowserRequestItem>e["detail"]["request"]).getHttpReqt()
        });
    };

    private _onItemAboutToBeDeleted = (e: Event): void => {
        const details = e["detail"];

        if (details["reqItem"] && details["reqItem"] instanceof BrowserRequestItem) {
            this.raise(this.eventItemAboutToBeDeleted, { item: (<BrowserRequestItem>details["reqItem"]).getHttpReqt() });
            return;
        }

        if (details["dirItem"] && details["dirItem"] instanceof BrowserDirItem) {
            this.raise(this.eventItemAboutToBeDeleted, { item: (<BrowserDirItem>details["dirItem"]).getHttpDir() });
            return;
        }

        if (details["authItem"] && details["authItem"] instanceof BrowserAuthItem) {
            this.raise(this.eventItemAboutToBeDeleted, { item: (<BrowserAuthItem>details["authItem"]).getHttpAuth() });
            return;
        }
    };

    private _onCloseRequested = (e: Event): void => {
        let sender = typeAflonTarget(e, BrowserCollectionItem);
        if (sender == null) return;

        this._closeCollection(sender);
    };

    private _onAuthSelected = (e: Event): void => {
        this.raise(this.eventItemSelected, {
            item: <BrowserAuthItem>(e["detail"]["auth"]).getHttpAuth()
        });
    };

    private _onAuthPinSelected = (e: Event): void => {
        this.raise(this.eventItemPinSelected, {
            item: <BrowserAuthItem>(e["detail"]["auth"]).getHttpAuth()
        });
    };

    private _onSaveTimeout(): void {
        this._saveCollections();
        this._promptUserForExternallyModifiedCollections();
    }

    private _onBeforeUnload = (): void => {
        this._saveCollections();
        clearInterval(this._saveTimer);

        this._updateOpenCollectionsCache();

        window.removeEventListener("beforeunload", this._onBeforeUnload);
    };
}

RequestBrowser.style = {
    _: {
        backgroundColor: Colors.browserBackDefault,
        minWidth: "200px",
        display: "flex",
        flexFlow: "column nowrap",
        height: "100%",
        borderRight: `solid 1px ${Colors.workspaceLine}`
    },
    _header: {
        display: "flex",
        flexFlow: "row nowrap",
        padding: "5px 10px"
    },
    _title: {
        ...FontStyles.sansSerifBold,
        fontSize: "12px",
        lineHeight: "25px",
        flex: "1 1 100px",
        color: Colors.consoleDominant
    },
    _content: {
        display: "flex",
        flexFlow: "column nowrap",
        flex: "1 0 1px",
        overflowY: "auto"
    },
    _placeholder: {
        ...FontStyles.sansSerifNormal,
        color: Colors.browserDefault,
        transition: "opacity 0.5s",
        opacity: "0.6",
        fontSize: "12px",
        textAlign: "center",
        padding: "20px",
        paddingTop: "50px",
        flex: "1 1 200px",
        "&:hover": {
            opacity: "1.0",
            transition: "opacity 0.5s"
        }
    },
    _importIcon: {
        fontSize: "13px",
        borderRadius: "4px",
        width: "25px",
        height: "25px",
        "&:hover": {
            background: Colors.browserBackSelected
        }
    },
    _newFileIcon: {
        fontSize: "14px",
        borderRadius: "4px",
        width: "25px",
        height: "25px",
        "&:hover": {
            background: Colors.browserBackSelected
        }
    },
    _experimentIcon: {
        fontSize: "14px",
        borderRadius: "4px",
        width: "25px",
        height: "25px",
        "&:hover": {
            background: Colors.browserBackSelected
        }
    }
};
