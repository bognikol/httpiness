import { Element, Div } from "aflon";

import { HttpReqt } from "../../lib/http";
import { SimpleEvent } from "../../lib/SimpleEvent";

import { ContextMenu, ContextMenuItemType } from "../ContextMenu";
import { Colors, FontStyles, getMethodColor, getShortMethodDesignation } from "../StyleConstants";
import { SimpleModals } from "../Modals";

import { BrowserItemName } from "./BrowserItemName";
import { IconButton } from "../IconButton";
import { RequestBrowser } from "./RequestBrowser";
import { RequestBrowserClipboard, RequestBrowserClipboardAction } from "./RequestBrowserClipboard";

export class BrowserRequestItem extends Div {
    public eventSelected = "selected";
    public eventPinSelected  = "pinSelected";
    public eventDeleteRequested = "deleteRequested";
    public eventDuplicateRequested = "duplicateRequested";

    private _typeDiv: Div;
    private _browserItemName: BrowserItemName;
    private _optionsDiv: Div;

    private _contextMenu: ContextMenu;

    private _reqt: HttpReqt;

    constructor(reqt: HttpReqt) {
        super();

        this._reqt = reqt;

        this.append([
            (this._typeDiv = new Div())
                .setText(getShortMethodDesignation(reqt.getRawHttpRequest().method))
                .setInlineCss({ color: getMethodColor(reqt.getRawHttpRequest().method) }),
            (this._browserItemName = new BrowserItemName())
                .setText(reqt.getName())
                .on(this._browserItemName.eventClick, () => this._onNameClick())
                .on(this._browserItemName.eventChange, () => this._onBrowserItemNameChange()),
            (this._optionsDiv = new Div())
                .append([
                    new IconButton("send")
                        .setTooltip("Send request")
                        .on("click", () => this._onSendClick()),
                    new IconButton("pin")
                        .setTooltip("Pin to workspace")
                        .on("click", () => this._onPinClick()),
                    new IconButton("delete")
                        .setTooltip("Delete request")
                        .on("click", () => this._onDeleteClick())

                ])
        ])
            .addAttr("draggable", "true")
            .on(this.eventMouseEnter, () => this._onMouseEnter())
            .on(this.eventMouseLeave, () => this._onMouseLeave())
            .on(this.eventDblClick, () => this._onDblClick())
            .on(this.eventDragStart, () => this._onDragStart())
            .on(this.eventDragOver, e => this._onDragOver(e))
            .on(this.eventDragEnter, () => this._onDragEnter())
            .on(this.eventDragLeave, () => this._onDragLeave())
            .on(this.eventDrop, e => this._onDrop(e));

        (this._contextMenu = new ContextMenu(this, [
            { id: "send", type: ContextMenuItemType.Button, text: "Send", iconName: "send" },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "preview", type: ContextMenuItemType.Button, text: "Preview" },
            { id: "pin", type: ContextMenuItemType.Button, text: "Pin", iconName: "pin" },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "cut", type: ContextMenuItemType.Button, text: "Cut" },
            { id: "copy", type: ContextMenuItemType.Button, text: "Copy" },
            { id: "duplicate", type: ContextMenuItemType.Button, text: "Duplicate" },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "rename", type: ContextMenuItemType.Button, text: "Rename" },
            { id: "delete", type: ContextMenuItemType.Button, text: "Delete", iconName: "delete" }
        ]))
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e));

        this._reqt
            .on(this._reqt.eventNameChanged, () => this._onReqtNameChanged())
            .on(this._reqt.eventMethodChanged, () => this._onReqtMethodChanged());
    }

    public getHttpReqt(): HttpReqt {
        return this._reqt;
    }

    public getName(): string {
        return this._reqt.getName();
    }

    private _findParentRequestBrowser(): RequestBrowser {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let e: Element = this;

        while (e != null) {
            if (e instanceof RequestBrowser)
                return e;

            e = e.parent();
        }

        throw new Error("Parent RequestBrowser cannot be found.");
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

    private _onDblClick(): void {
        this.raise(this.eventPinSelected);
    }

    private _onSendClick(): void {
        this._findParentRequestBrowser().reportReqtSendRequested(this._reqt);
    }

    private _onPinClick(): void {
        this.raise(this.eventPinSelected);
    }

    private _onNameClick(): void {
        this.raise(this.eventSelected);
    }

    private _onDeleteClick(): void {
        this.raise(this.eventDeleteRequested);
    }

    private _onReqtNameChanged(): void {
        this._browserItemName.setText(this._reqt.getName());
    }

    private _onReqtMethodChanged(): void {
        this._typeDiv
            .setText(getShortMethodDesignation(this._reqt.getRawHttpRequest().method))
            .setInlineCss({ color: getMethodColor(this._reqt.getRawHttpRequest().method) });
    }

    private _onBrowserItemNameChange(): void {
        let newName = this._browserItemName.getText();

        if (this._reqt.getParent().containsChild(newName)) {
            SimpleModals.alert(`Cannot rename item: another item with name ${newName} already exists.`);
            this._browserItemName.setText(this._reqt.getName());
            return;
        }

        this._reqt.setName(this._browserItemName.getText());
    }

    private _onRenameRequested(): void {
        setTimeout(() => this._browserItemName.makeChangeReady(), 10);
    }

    private _onContextMenuSelected(e: SimpleEvent): void {
        const id = e["detail"]["id"];
        if (!id) return;

        if (id == "send") {
            this._findParentRequestBrowser().reportReqtSendRequested(this._reqt);
        } else if (id == "preview") {
            this.raise(this.eventSelected);
        } else if (id == "pin") {
            this.raise(this.eventPinSelected);
        } else if (id == "cut") {
            RequestBrowserClipboard.setValueToCut(this);
        } else if (id == "copy") {
            RequestBrowserClipboard.setValueToCopy(this);
        } else if (id == "duplicate") {
            this.raise(this.eventDuplicateRequested);
        } else if (id == "rename") {
            this._onRenameRequested();
        } else if (id == "delete") {
            this.raise(this.eventDeleteRequested);
        }
    }

    private _onDragStart(): void {
        RequestBrowserClipboard.setValueToCut(this);
    }

    private _onDragOver(e: Event): void {
        e.preventDefault();
        let dragEvent = <DragEvent>e;

        let clipboardValue = RequestBrowserClipboard.getValue();

        if (clipboardValue.parent() == this.parent() && clipboardValue instanceof BrowserRequestItem) {
            dragEvent.dataTransfer.effectAllowed = "move";
        } else {
            dragEvent.dataTransfer.effectAllowed = "none";
        }
    }

    private _onDragEnter(): void {
        this.setInlineCss({
            borderBottom: `solid 1px ${Colors.workspaceLine}`
        });
    }

    private _onDragLeave(): void {
        this.setInlineCss({
            borderBottom: "none"
        });
    }

    private _onDrop(e: Event): void {
        e.preventDefault();
        this.setInlineCss({
            borderBottom: "none"
        });

        const item = RequestBrowserClipboard.getValue();
        const action = RequestBrowserClipboard.getAction();

        if (action != RequestBrowserClipboardAction.Cut) return;
        if (!(item instanceof BrowserRequestItem)) return;
        if (item == this) return;

        if (this.parent() != item.parent() && this.getHttpReqt().getParent().containsChild(item.getName())) {
            SimpleModals.alert(`Cannot move item ${item.getName()} because item with same name already exists.`);
            return;
        }

        item.getHttpReqt().getParent().removeReqt(item.getHttpReqt());
        this.getHttpReqt().getParent().addReqt(item.getHttpReqt(), this.getHttpReqt());

        item.parent().removeChild(item);
        this.insertAfter(item);

        RequestBrowserClipboard.clearValue();
    }
}

BrowserRequestItem.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        height: "25px",
        width: "100%",
        paddingRight: "10px",
        userSelect: "none",
        position: "relative",
        "&:hover": {
            background: Colors.browserBackHover
        }
    },
    _typeDiv: {
        ...FontStyles.sansSerifExtraBold,
        flex: "0 0 28px",
        color: Colors.browserDefault,
        fontSize: "8px",
        //lineHeight: "25px",
        textAlign: "center"
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
