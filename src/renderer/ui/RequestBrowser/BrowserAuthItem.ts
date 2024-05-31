import { Div } from "aflon";

import { HttpAuth, HttpDir } from "../../lib/http";
import { SimpleEvent } from "../../lib/SimpleEvent";

import { ContextMenu, ContextMenuItemType } from "../ContextMenu";
import { Colors, FontStyles } from "../StyleConstants";
import { SimpleModals } from "../Modals";
import { IconButton } from "../IconButton";

import { BrowserItemName } from "./BrowserItemName";
import { RequestBrowserClipboard } from "./RequestBrowserClipboard";

export class BrowserAuthItem extends Div {
    public eventSelected = "selected";
    public eventPinSelected  = "pinSelected";
    public eventDeleteRequested = "deleteRequested";
    public eventDuplicateRequested = "duplicateRequested";

    private _typeDiv: Div;
    private _browserItemName: BrowserItemName;
    private _optionsDiv: Div;

    private _contextMenu: ContextMenu;

    private _auth: HttpAuth;

    constructor(auth: HttpAuth) {
        super();

        this._auth = auth;

        this.append([
            (this._typeDiv = new Div())
                .setText("Auth"),
            (this._browserItemName = new BrowserItemName())
                .setText(auth.getName())
                .on(this._browserItemName.eventClick, () => this._onNameClick())
                .on(this._browserItemName.eventChange, () => this._onBrowserItemNameChange()),
            (this._optionsDiv = new Div())
                .append([
                    new IconButton("pin")
                        .setTooltip("Pin to workspace")
                        .on("click", () => this._onPinClick()),
                    new IconButton("delete")
                        .setTooltip("Delete request")
                        .on("click", () => this._onDeleteClick())
                ])
        ])
            .on(this.eventMouseEnter, () => this._onMouseEnter())
            .on(this.eventMouseLeave, () => this._onMouseLeave())
            .on(this.eventDblClick, () => this._onDblClick());

        (this._contextMenu = new ContextMenu(this, [
            { id: "preview", type: ContextMenuItemType.Button, text: "Preview" },
            { id: "pin", type: ContextMenuItemType.Button, text: "Pin", iconName: "pin" },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "cut", type: ContextMenuItemType.Button, text: "Cut", disabled: true },
            { id: "copy", type: ContextMenuItemType.Button, text: "Copy", disabled: true },
            { id: "duplicate", type: ContextMenuItemType.Button, text: "Duplicate", disabled: true },
            { id: "divider", type: ContextMenuItemType.Divider },
            { id: "rename", type: ContextMenuItemType.Button, text: "Rename" },
            { id: "delete", type: ContextMenuItemType.Button, text: "Delete", iconName: "delete" }
        ]))
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e));

        this._auth
            .on(this._auth.eventNameChanged, () => this._onReqtNameChanged());
    }

    public getHttpAuth(): HttpAuth {
        return this._auth;
    }

    public getName(): string {
        return this._auth.getName();
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
        this._browserItemName.setText(this._auth.getName());
    }

    private _onBrowserItemNameChange(): void {
        let newName = this._browserItemName.getText();

        let parent = this._auth.getParent();
        if (parent instanceof HttpDir && parent.containsChild(newName)) {
            SimpleModals.alert(`Cannot rename item: another item with name ${newName} already exists.`);
            this._browserItemName.setText(this._auth.getName());
            return;
        }

        this._auth.setName(this._browserItemName.getText());
    }

    private _onRenameRequested(): void {
        setTimeout(() => this._browserItemName.makeChangeReady(), 10);
    }

    private _onContextMenuSelected(e: SimpleEvent): void {
        const id = e["detail"]["id"];
        if (!id) return;

        if (id == "preview") {
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
}

BrowserAuthItem.style = {
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
