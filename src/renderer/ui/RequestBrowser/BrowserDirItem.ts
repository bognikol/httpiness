import { Div, typeAflonTarget } from "aflon";

import { AuthType, HttpAuth, HttpDir, HttpReqt } from "../../lib/http";
import { SimpleEvent } from "../../lib/SimpleEvent";

import { ContextMenu, ContextMenuItemType } from "../ContextMenu";
import { Colors, FontStyles } from "../StyleConstants";
import { SimpleModals } from "../Modals";

import { BrowserAuthItem } from "./BrowserAuthItem";
import { BrowserItemName } from "./BrowserItemName";
import { BrowserRequestItem } from "./BrowserRequestItem";
import { IconButton } from "../IconButton";
import { RequestBrowserClipboard, RequestBrowserClipboardAction } from "./RequestBrowserClipboard";

export class BrowserDirItem extends Div {
    private static _defaultNewDirName = "Untitled directory";
    private static _defaultNewRequestName = "Untitled request";
    private static _defaultNewAuthName = "Untitled auth";

    public eventDeleteRequested = "deleteRequested";
    public eventAuthSelected    = "authSelected";
    public eventRequestSelected = "requestSelected";
    public eventAuthPinSelected    = "authPinSelected";
    public eventRequestPinSelected = "requestPinSelected";
    public eventItemAboutToBeDeleted = "itemAboutToBeDeleted";

    private _itemContainer: Div;
    private _triangle: Div;
    private _browserItemName: BrowserItemName;
    private _optionsDiv: Div;
    private _authContainer: Div;
    private _dirContainer: Div;
    private _reqtContainer: Div;

    private _contextMenu: ContextMenu;

    private _dir: HttpDir;
    private _expanded: boolean = false;

    constructor(dir: HttpDir) {
        super();

        this._dir = dir;

        this.append([
            (this._itemContainer = new Div())
                .append([
                    (this._triangle = new Div())
                        .setText("▶")
                        .on(this._triangle.eventClick, () => this._onClick()),
                    (this._browserItemName = new BrowserItemName())
                        .setText(dir.getName())
                        .on(this._browserItemName.eventChange, () => this._onBrowserItemChange())
                        .on(this._browserItemName.eventClick, () => this._onClick()),
                    (this._optionsDiv = new Div())
                        .append([
                            new IconButton("new-req")
                                .setTooltip("Create new request")
                                .on("click", () => this._onNewReqtRequested()),
                            new IconButton("new-dir")
                                .setTooltip("Create new directory")
                                .on("click", () => this._onNewDirRequested()),
                            new IconButton("delete")
                                .setTooltip("Delete directory")
                                .on("click", () => this._onDeleteRequested())
                        ])
                ])
                .addAttr("draggable", "true")
                .on(this.eventMouseEnter, () => this._onMouseEnter())
                .on(this.eventMouseLeave, () => this._onMouseLeave())
                .on(this.eventDragStart, () => this._onDragStart())
                .on(this.eventDragOver, e => this._onDragOver(e))
                .on(this.eventDragEnter, () => this._onDragEnter())
                .on(this.eventDragLeave, () => this._onDragLeave())
                .on(this.eventDrop, e => this._onDrop(e)),
            (this._dirContainer = new Div()),
            (this._authContainer = new Div()),
            (this._reqtContainer = new Div())
        ]);

        (this._contextMenu = new ContextMenu(this._itemContainer, [
            { id: "new-req", type: ContextMenuItemType.Button, text: "New Request", iconName: "new-req" },
            { id: "new-dir", type: ContextMenuItemType.Button, text: "New Directory", iconName: "new-dir" },
            { id: "new-auth", type: ContextMenuItemType.Button, text: "New Authentication" },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "cut", type: ContextMenuItemType.Button, text: "Cut" },
            { id: "copy", type: ContextMenuItemType.Button, text: "Copy" },
            { id: "paste", type: ContextMenuItemType.Button, text: "Paste", disabled: true },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "rename", type: ContextMenuItemType.Button, text: "Rename" },
            { id: "delete", type: ContextMenuItemType.Button, text: "Delete", iconName: "delete" }
        ]))
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e))
            .on(this._contextMenu.eventAboutToBeShown, () => this._onContextMenuAboutToBeShown());
    }

    getHttpDir(): HttpDir {
        return this._dir;
    }

    public getName(): string {
        return this._dir.getName();
    }

    setExpanded(expanded: boolean): this {
        if (this._expanded == expanded) return this;

        this._expanded = expanded;

        if (this._expanded) {
            this._triangle.setInlineCss({ transform: "rotate(90deg)" });
            this._authContainer.append(
                this._dir.getAuths()
                    .map(auth => {
                        let authItem = new BrowserAuthItem(auth);
                        this._attachAllEventHandlersToAuthItem(authItem);
                        return authItem;
                    })
            );
            this._dirContainer.append(
                this._dir.getDirs()
                    .map(dir => {
                        let dirItem = new BrowserDirItem(dir);
                        this._attachAllEventHandlersToDirItem(dirItem);
                        return dirItem;
                    })
            );
            this._reqtContainer.append(
                this._dir.getReqts()
                    .map(reqt =>  {
                        let reqItem = new BrowserRequestItem(reqt);
                        this._attachAllEventHandlersToReqtItem(reqItem);
                        return reqItem;
                    })
            );
        } else {
            this._triangle.setInlineCss({ transform: "none" });
            this._authContainer.children().forEach(element => {
                if (element instanceof BrowserAuthItem)
                    this._removeAllEventHandlersFromAuthItem(element);
            });
            this._dirContainer.children().forEach(element => {
                if (element instanceof BrowserDirItem)
                    this._removeAllEventHandlerFromDirItem(element);
            });
            this._reqtContainer.children().forEach(element => {
                if (element instanceof BrowserRequestItem)
                    this._removeAllEventHandlersFromReqtItem(element);
            });
            this._authContainer.empty();
            this._dirContainer.empty();
            this._reqtContainer.empty();
        }

        return this;
    }

    getExpanded(): boolean {
        return this._expanded;
    }

    private _attachAllEventHandlersToAuthItem(item: BrowserAuthItem): void {
        item.on(item.eventDeleteRequested, this._onAuthItemDeleteRequested);
        item.on(item.eventSelected, this._onAuthItemSelected);
        item.on(item.eventPinSelected, this._onAuthItemPinSelected);
    }

    private _removeAllEventHandlersFromAuthItem(item: BrowserAuthItem): void {
        item.off(item.eventDeleteRequested, this._onAuthItemDeleteRequested);
        item.off(item.eventSelected, this._onAuthItemSelected);
        item.off(item.eventPinSelected, this._onAuthItemPinSelected);
    }

    private _attachAllEventHandlersToReqtItem(item: BrowserRequestItem): void {
        item.on(item.eventDeleteRequested, this._onReqItemDeleteRequested);
        item.on(item.eventSelected, this._onReqItemSelected);
        item.on(item.eventPinSelected, this._onReqItemPinSelected);
        item.on(item.eventDuplicateRequested, this._onReqItemDuplicateRequested);
    }

    private _removeAllEventHandlersFromReqtItem(item: BrowserRequestItem): void {
        item.off(item.eventDeleteRequested, this._onReqItemDeleteRequested);
        item.off(item.eventSelected, this._onReqItemSelected);
        item.off(item.eventPinSelected, this._onReqItemPinSelected);
        item.off(item.eventDuplicateRequested, this._onReqItemDuplicateRequested);
    }

    private _attachAllEventHandlersToDirItem(item: BrowserDirItem): void {
        item.on(item.eventDeleteRequested, this._onDirItemDeleteRequested);
        item.on(item.eventRequestSelected, this._onDirRequestSelected);
        item.on(item.eventRequestPinSelected, this._onDirRequestPinSelected);
        item.on(item.eventAuthSelected, this._onDirAuthSelected);
        item.on(item.eventAuthPinSelected, this._onDirAuthPinSelected);
        item.on(item.eventItemAboutToBeDeleted, this._onItemAboutToBeDeleted);
    }

    private _removeAllEventHandlerFromDirItem(item: BrowserDirItem): void {
        item.off(item.eventDeleteRequested, this._onDirItemDeleteRequested);
        item.off(item.eventRequestSelected, this._onDirRequestSelected);
        item.off(item.eventRequestPinSelected, this._onDirRequestPinSelected);
        item.off(item.eventAuthSelected, this._onDirAuthSelected);
        item.off(item.eventAuthPinSelected, this._onDirAuthPinSelected);
        item.off(item.eventItemAboutToBeDeleted, this._onItemAboutToBeDeleted);
    }

    private _generateDefaultNewRequestName(): string {
        const existingUntitledDirNames =
            this._dir.getReqts()
                .map(dir => dir.getName())
                .filter(name => name.indexOf(BrowserDirItem._defaultNewRequestName) == 0);

        if (existingUntitledDirNames.length == 0) return BrowserDirItem._defaultNewRequestName;

        for (let i = 1; i <= 1000; i++) {
            const candidate = `${BrowserDirItem._defaultNewRequestName} (${i})`;
            if (!existingUntitledDirNames.includes(candidate))
                return candidate;
        }

        return BrowserDirItem._defaultNewRequestName;
    }

    private _generateDefaultNewAuthName(): string {
        if (this._dir.getAuths().length == 0)
            return "Default Auth";

        const existingUntitledAuthNames =
            this._dir.getAuths()
                .map(auth => auth.getName())
                .filter(name => name.indexOf(BrowserDirItem._defaultNewAuthName) == 0);

        if (existingUntitledAuthNames.length == 0) return BrowserDirItem._defaultNewAuthName;

        for (let i = 1; i <= 10000; i++) {
            const candidate = `${BrowserDirItem._defaultNewAuthName} (${i})`;
            if (!existingUntitledAuthNames.includes(candidate))
                return candidate;
        }

        return BrowserDirItem._defaultNewAuthName;
    }

    private _generateDefaultNewDirName(): string {
        const existingUntitledDirNames =
            this._dir.getDirs()
                .map(dir => dir.getName())
                .filter(name => name.indexOf(BrowserDirItem._defaultNewDirName) == 0);

        if (existingUntitledDirNames.length == 0) return BrowserDirItem._defaultNewDirName;

        for (let i = 1; i <= 1000; i++) {
            const candidate = `${BrowserDirItem._defaultNewDirName} (${i})`;
            if (!existingUntitledDirNames.includes(candidate))
                return candidate;
        }

        return BrowserDirItem._defaultNewDirName;
    }

    private _onNewAuthRequested(): void {
        this.setExpanded(true);

        let auth = new HttpAuth()
            .setAuthDefinition({ type: AuthType.Bearer, bearerToken: "" })
            .setName(this._generateDefaultNewAuthName());

        this._dir.addAuth(auth);

        let newItem = new BrowserAuthItem(auth);
        this._attachAllEventHandlersToAuthItem(newItem);
        this._authContainer.append([ newItem ]);
    }

    private _onAuthItemDeleteRequested = async (e: Event): Promise<void> => {
        let authItem: BrowserAuthItem = typeAflonTarget(e, BrowserAuthItem);
        if (authItem == null) return;

        let auth = authItem.getHttpAuth();

        if (! await SimpleModals.confirm(`Are you sure you want to delete authorization '${auth.getName()}'?`)) return;

        this.raise(this.eventItemAboutToBeDeleted, { authItem });
        this._removeAllEventHandlersFromAuthItem(authItem);
        this._authContainer.removeChild(authItem);
        this._dir.removeAuth(auth);
    };

    private _onNewReqtRequested(): void {
        this.setExpanded(true);

        let newRequest: HttpReqt = new HttpReqt()
            .setName(this._generateDefaultNewRequestName());

        this._dir.addReqt(newRequest);

        let newItem = new BrowserRequestItem(newRequest);
        this._attachAllEventHandlersToReqtItem(newItem);

        this._reqtContainer.append([ newItem ]);
        this.raise(this.eventRequestPinSelected, { request: newItem, makeNameEditable: true });
    }

    private _onReqItemDeleteRequested = async (e: Event): Promise<void> => {
        let reqItem: BrowserRequestItem = typeAflonTarget(e, BrowserRequestItem);
        if (reqItem == null) return;
        let reqt = reqItem.getHttpReqt();

        if (! await SimpleModals.confirm(`Are you sure you want to delete request '${reqt.getName()}'?`)) return;

        this.raise(this.eventItemAboutToBeDeleted, { reqItem });
        this._removeAllEventHandlersFromReqtItem(reqItem);
        this._reqtContainer.removeChild(reqItem);
        this._dir.removeReqt(reqt);
    };

    private _onNewDirRequested(): void {
        this.setExpanded(true);

        let newDir: HttpDir = new HttpDir()
            .setName(this._generateDefaultNewDirName());

        this._dir.addDir(newDir);

        let newItem = new BrowserDirItem(newDir);
        this._attachAllEventHandlersToDirItem(newItem);
        this._dirContainer.append([ newItem ]);
    }

    private _onDirItemDeleteRequested = async (e: Event): Promise<void> => {
        let dirItem: BrowserDirItem = typeAflonTarget(e, BrowserDirItem);
        if (dirItem == null) return;
        let dir = dirItem.getHttpDir();

        if (! await SimpleModals.confirm(`Are you sure you want to delete directory '${dir.getName()}'?`)) return;

        this.raise(this.eventItemAboutToBeDeleted, { dirItem });
        this._removeAllEventHandlerFromDirItem(dirItem);
        this._dirContainer.removeChild(dirItem);
        this._dir.removeDir(dir);
    };

    private _onDeleteRequested(): void {
        this.raise(this.eventDeleteRequested);
    }

    private _onClick(): void {
        this.setExpanded(!this.getExpanded());
    }

    private _onMouseEnter(): void {
        this._optionsDiv.setInlineCss({
            display: "flex"
        });
    }

    private _onMouseLeave(): void {
        this._optionsDiv.setInlineCss({
            display: "none"
        });
    }

    private _onBrowserItemChange(): void {
        let newName = this._browserItemName.getText();

        if (this._dir.getParent().containsChild(newName)) {
            SimpleModals.alert(`Cannot rename item: another item with name ${newName} already exists.`);
            this._browserItemName.setText(this._dir.getName());
            return;
        }

        this._dir.setName(this._browserItemName.getText());
    }

    private _onRenameRequested(): void {
        setTimeout(() => this._browserItemName.makeChangeReady(), 10);
    }

    private _onPaste(): void {
        const item = RequestBrowserClipboard.getValue();
        const action = RequestBrowserClipboard.getAction();

        if (this._dir.containsChild(item.getName())) {
            SimpleModals.alert(`Cannot paste here because item with name ${item.getName()} already exists.`);
            return;
        }

        let parent = null;
        if (item && item.parent())
            parent = item.parent().parent();

        if (item == this || parent == this) return;

        if (action == RequestBrowserClipboardAction.Cut) {
            if (item instanceof BrowserRequestItem) {
                item.getHttpReqt().getParent().removeReqt(item.getHttpReqt());
                item.parent().removeChild(item);
                this._dir.addReqt(item.getHttpReqt());
                if (this._expanded) {
                    let reqItem = new BrowserRequestItem(item.getHttpReqt());
                    this._attachAllEventHandlersToReqtItem(reqItem);
                    this._reqtContainer.append([ reqItem ]);
                }
            } else if (item instanceof BrowserDirItem) {
                item.getHttpDir().getParent().removeDir(item.getHttpDir());
                item.parent().removeChild(item);
                this._dir.addDir(item.getHttpDir());
                if (this._expanded) {
                    let dirItem = new BrowserDirItem(item.getHttpDir());
                    this._attachAllEventHandlersToDirItem(dirItem);
                    this._dirContainer.append([ dirItem ]);
                }
            }
            RequestBrowserClipboard.clearValue();
        } else if (action == RequestBrowserClipboardAction.Copy) {
            if (item instanceof BrowserRequestItem) {
                let itemClone = item.getHttpReqt().clone();
                this._dir.addReqt(itemClone);
                if (this._expanded) {
                    let reqItem = new BrowserRequestItem(itemClone);
                    this._attachAllEventHandlersToReqtItem(reqItem);
                    this._reqtContainer.append([ reqItem ]);
                }
            } else if (item instanceof BrowserDirItem) {
                let itemClone = item.getHttpDir().clone();
                this._dir.addDir(itemClone);
                if (this._expanded) {
                    let dirItem = new BrowserDirItem(itemClone);
                    this._attachAllEventHandlersToDirItem(dirItem);
                    this._dirContainer.append([ dirItem ]);
                }
            }
        }
    }

    private _onReqItemSelected = (e: Event): void => {
        let reqItem: BrowserRequestItem = typeAflonTarget(e, BrowserRequestItem);
        if (reqItem == null) return;
        this.raise(this.eventRequestSelected, { request: reqItem });
    };

    private _onAuthItemSelected = (e: Event): void => {
        let authItem: BrowserAuthItem = typeAflonTarget(e, BrowserAuthItem);
        if (authItem == null) return;
        this.raise(this.eventAuthSelected, { auth: authItem });
    };

    private _onReqItemPinSelected = (e: Event): void => {
        let reqItem: BrowserRequestItem = typeAflonTarget(e, BrowserRequestItem);
        if (reqItem == null) return;
        this.raise(this.eventRequestPinSelected, { request: reqItem });
    };

    private _onAuthItemPinSelected = (e: Event): void => {
        let authItem: BrowserAuthItem = typeAflonTarget(e, BrowserAuthItem);
        if (authItem == null) return;
        this.raise(this.eventAuthPinSelected, { auth: authItem });
    };

    private _onReqItemDuplicateRequested = (e: Event): void => {
        let reqItem: BrowserRequestItem = typeAflonTarget(e, BrowserRequestItem);
        if (reqItem == null) return;
        let itemClone = reqItem.getHttpReqt().clone();
        let name: string = itemClone.getName();
        let suffix = " - Copy";

        while (this._dir.containsChild(name)) {
            name += suffix;
        }

        itemClone.setName(name);
        this._dir.addReqt(itemClone);
        if (this._expanded) {
            let reqItem = new BrowserRequestItem(itemClone);
            this._attachAllEventHandlersToReqtItem(reqItem);
            this._reqtContainer.append([ reqItem ]);
        }
    };

    private _onDirAuthSelected =
        (e: Event): this => this.raise(this.eventAuthSelected, { ... e["detail"] });

    private _onDirAuthPinSelected =
        (e: Event): this => this.raise(this.eventAuthPinSelected, { ... e["detail"] });

    private _onDirRequestSelected =
        (e: Event): this => this.raise(this.eventRequestSelected, { ... e["detail"] });

    private _onDirRequestPinSelected =
        (e: Event): this => this.raise(this.eventRequestPinSelected, { ... e["detail"] });

    private _onItemAboutToBeDeleted =
        (e: Event): this => this.raise(this.eventItemAboutToBeDeleted, { ...  e["detail"] });

    private _onContextMenuSelected(e: SimpleEvent): void {
        const id = e["detail"]["id"];
        if (!id) return;

        if (id == "new-req") {
            this._onNewReqtRequested();
        } else if (id == "new-dir") {
            this._onNewDirRequested();
        } else if (id == "new-auth") {
            this._onNewAuthRequested();
        } else if (id == "cut") {
            RequestBrowserClipboard.setValueToCut(this);
        } else if (id == "copy") {
            RequestBrowserClipboard.setValueToCopy(this);
        } else if (id == "paste") {
            this._onPaste();
        } else if (id == "rename") {
            this._onRenameRequested();
        } else if (id == "delete") {
            this._onDeleteRequested();
        }
    }

    private _onContextMenuAboutToBeShown(): void {
        if (RequestBrowserClipboard.getValue() == null ||
            RequestBrowserClipboard.getAction() == RequestBrowserClipboardAction.None) {
            this._contextMenu.setItemDisabled("paste", true);
        } else {
            this._contextMenu.setItemDisabled("paste", false);
        }
    }

    private _onDragStart(): void {
        RequestBrowserClipboard.setValueToCut(this);
    }

    private _onDragOver(e: Event): void {
        e.preventDefault();
        let dragEvent = <DragEvent>e;

        let clipboardValue = RequestBrowserClipboard.getValue();

        let parent = null;
        if (clipboardValue && clipboardValue.parent())
            parent = clipboardValue.parent().parent();

        if (clipboardValue == this || parent == this) {
            dragEvent.dataTransfer.effectAllowed = "none";
        } else {
            dragEvent.dataTransfer.effectAllowed = "move";
        }

    }

    private  _onDragEnter(): void {
        let clipboardValue = RequestBrowserClipboard.getValue();

        let parent = null;
        if (clipboardValue && clipboardValue.parent())
            parent = clipboardValue.parent().parent();

        if (clipboardValue == this || parent == this) return;

        this._itemContainer.setInlineCss({
            outline: `solid 1px ${Colors.workspaceLine}`,
            outlineOffset: "-1px"
        });
    }

    private _onDragLeave(): void {
        this._itemContainer.setInlineCss({
            outline: "none",
            outlineOffset: "0"
        });
    }

    private _onDrop(e: Event): void {
        e.preventDefault();
        this._itemContainer.setInlineCss({
            outline: "none",
            outlineOffset: "0"
        });
        this._onPaste();
    }
}

BrowserDirItem.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        width: "100%",
        position: "relative"
    },
    _itemContainer: {
        display: "flex",
        flexFlow: "row nowrap",
        height: "25px",
        width: "100%",
        paddingRight: "10px",
        "&:hover": {
            background: Colors.browserBackHover
        }
    },
    _authContainer: {
        display: "flex",
        flexFlow: "column nowrap",
        paddingLeft: "23px"
    },
    _dirContainer: {
        display: "flex",
        flexFlow: "column nowrap",
        paddingLeft: "23px"
    },
    _reqtContainer: {
        display: "flex",
        flexFlow: "column nowrap",
        paddingLeft: "23px"
    },
    _triangle: {
        ...FontStyles.sansSerifExtraBold,
        flex: "0 0 28px",
        height: "100%",
        color: Colors.browserDefault,
        fontSize: "10px",
        lineHeight: "25px",
        textAlign: "center",
        cursor: "pointer"
    },
    _browserItemName: {
        flex: "1 1 100px",
        height: "100%"
    },
    _optionsDiv: {
        display: "none",
        flexFlow: "row nowrap"
    }
};
