import { CSS, Div, Span } from "aflon";

import { Clipboard } from "../../../lib/Clipboard";
import { SimpleEvent } from "../../../lib/SimpleEvent";
import { IMacroContext } from "../../../lib/http";

import { Colors, FontStyles } from "../../StyleConstants";
import { ContextMenuItemType, ContextMenu, ContextMenuItemDefinition } from "../../ContextMenu";

export enum ResponseBodyTextFormatting {
    Unknown, Plain, JSON, XML
}

export class HttpResponseBodyTextPreviewer extends Div {
    private static _searchClass: string = CSS.class({
        background: Colors.workspaceSearch,
        color: Colors.backgroundDefault,
        borderRadius: "2px"
    });

    private static _focusClass: string = CSS.class({
        border: `solid 2px ${Colors.workspaceSearchFocus}`
    });

    private static _searchIdPrefix = "htbsrch-";

    public eventSearchResultsUpdated = "searchResultUpdated";

    private _text: string = "";
    private _formatting: ResponseBodyTextFormatting = ResponseBodyTextFormatting.Plain;
    private _macroContext: IMacroContext;
    private _searchPhrase: string;

    private _contextMenu: ContextMenu;

    private _numberOfFoundPhrases: number = 0;
    private _currentSearchResultInFocus: number = -1;

    private _currentSearchFocus: HTMLElement = null;

    constructor() {
        super();

        this._contextMenu = new ContextMenu(this, [
            { type: ContextMenuItemType.Button, text: "Copy", id: "copy" },
            { type: ContextMenuItemType.Button, text: "Set as parameter value", id: "param", disabled: true }
        ]);

        this._contextMenu
            .on(this._contextMenu.eventAboutToBeShown, () => this._onContextMenuAboutToBeShown())
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e));
    }

    setText(text: string, formatting: ResponseBodyTextFormatting = ResponseBodyTextFormatting.Unknown, macroContext: IMacroContext = null): this {
        this._text = text;
        this._macroContext = macroContext;

        if (formatting != ResponseBodyTextFormatting.Unknown)
            this._formatting = formatting;

        this._update();
        this._setSearchFocus(0);

        return this;
    }

    getText(): string {
        return this._text;
    }

    setFormatting(formatting: ResponseBodyTextFormatting): this {
        if (this._formatting == formatting) return this;

        this._formatting = formatting;
        this._update();

        return this;
    }

    getFormatting(): ResponseBodyTextFormatting {
        return this._formatting;
    }

    setSearchPhrase(searchPhrase: string): this {
        if (this._searchPhrase == searchPhrase) return this;

        this._searchPhrase = searchPhrase;
        this._update();
        this._setSearchFocus(0);

        return this;
    }

    getSearchPhrase(): string {
        return this._searchPhrase;
    }

    searchFocusNext(): this {
        this._setSearchFocus(this._currentSearchResultInFocus + 1);
        return this;
    }

    searchFocusPrevious(): this {
        this._setSearchFocus(this._currentSearchResultInFocus - 1);
        return this;
    }

    private _setSearchFocus(itemNo: number): void {
        if (this._numberOfFoundPhrases == 0) return;

        if (itemNo > this._numberOfFoundPhrases - 1)
            itemNo = itemNo % this._numberOfFoundPhrases;

        if (itemNo < 0)
            itemNo = this._numberOfFoundPhrases + itemNo;

        this._currentSearchResultInFocus = itemNo;

        if (this._currentSearchFocus != null)
            this._currentSearchFocus.classList.remove(HttpResponseBodyTextPreviewer._focusClass);

        this._currentSearchFocus = document.getElementById(`${HttpResponseBodyTextPreviewer._searchIdPrefix}${this._currentSearchResultInFocus}`);

        if (this._currentSearchFocus != null) {
            this._currentSearchFocus.scrollIntoView({ block: "center", behavior: "smooth" });
            this._currentSearchFocus.classList.add(HttpResponseBodyTextPreviewer._focusClass);
        }
    }

    private _update(): void {
        let numberOfFound = 0;

        let actualText = this._text;

        if (this._formatting == ResponseBodyTextFormatting.JSON) {
            actualText = this._formatAsJSON(this._text);
        } else if (this._formatting == ResponseBodyTextFormatting.XML) {
            actualText = this._formatAsXML(this._text);
        }

        if (this._currentSearchFocus != null)
            this._currentSearchFocus.classList.remove(HttpResponseBodyTextPreviewer._focusClass);

        if (!this._searchPhrase) {
            super.setText(actualText);
            numberOfFound = 0;
        } else {
            let parts = actualText.split(this._searchPhrase);

            numberOfFound = parts.length - 1;
            if (numberOfFound < 0) numberOfFound = 0;

            super.empty();
            parts.forEach((part, i) => {
                if (i == parts.length - 1)
                    super.append([ new Span().setText(part) ]);
                else
                    super.append([
                        new Span().setText(part),
                        new Span()
                            .setText(this._searchPhrase)
                            .addClass(HttpResponseBodyTextPreviewer._searchClass)
                            .setId(`${HttpResponseBodyTextPreviewer._searchIdPrefix}${i}`)
                    ]);
            });
        }

        if (this._numberOfFoundPhrases != numberOfFound) {
            this._numberOfFoundPhrases = numberOfFound;
            this.raise(this.eventSearchResultsUpdated, { numberOfFoundPhrases: this._numberOfFoundPhrases });
        }
    }

    private _formatAsJSON(text: string): string {
        try {
            return JSON.stringify(JSON.parse(text), null, 2);
        } catch (ex) {
            return text;
        }
    }

    private _formatAsXML(text: string): string {
        return text;
    }

    private _onContextMenuSelected(e: SimpleEvent): void {
        const id = e["detail"]["id"];
        if (!id) return;

        let text = "";
        if (window.getSelection) {
            text = window.getSelection().toString();
        }

        if (id == "copy") {
            Clipboard.setText(text);
        } else if (id != "params") {
            this._macroContext.setMacro(<string>id, text, this._macroContext.isMacroSensitive(<string>id));
        }
    }

    private _onContextMenuAboutToBeShown(): void {
        let parameters: Array<ContextMenuItemDefinition> = [];

        if (this._macroContext != null) {
            parameters = this._macroContext.getMacroNames().map(name => ({
                type: ContextMenuItemType.Button,
                text: name,
                id: name
            }));
        }

        this._contextMenu.setDefinition([
            { type: ContextMenuItemType.Button, text: "Copy", id: "copy" },
            { type: ContextMenuItemType.Button, text: "Set as parameter value", id: "params", submenu: parameters }]);
    }
}

HttpResponseBodyTextPreviewer.style = {
    _: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        userSelect: "text"
    }
};
