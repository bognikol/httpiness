import { Div, Element } from "aflon";
import { ContextMenuItemType } from ".";

import { BoxShadowValues, Colors, ZIndexLayers } from "../StyleConstants";

import { ContextMenuItem } from "./ContextMenuItem";

export class Tooltip extends Div {
    eventAboutToBeShown: string = "aboutToBeShown";

    private _owner: Element;

    private _stale: boolean = true;
    private _title: string = "";
    private _text: string = "Tooltip";

    private _width: number = 0;
    private _height: number = 0;

    constructor(owner: Element) {
        super();
        this.setInlineCss({ display: "none" });

        this._owner = owner;

        this._owner.append([ this ]);
        this._owner.on(this._owner.eventMouseEnter, e => this._onOwnerEnter(e));
        this._owner.on(this._owner.eventMouseLeave, () => this._onOwnerLeave());

        return this;
    }

    getOwner(): Element {
        return this._owner;
    }

    setTitle(title: string): this {
        if (this._title == title) return this;
        this._title = title;
        this._stale = true;
        return this;
    }

    getTitle(): string {
        return this._title;
    }

    setText(text: string): this {
        if (this._text == text) return this;
        this._text = text;
        this._stale = true;
        return this;
    }

    getText(): string {
        return this._text;
    }

    private _update(): void {
        this.empty();

        if (this._title)
            this.append([
                ContextMenuItem.create({
                    type: ContextMenuItemType.Title,
                    id: "title",
                    text: this._title})
            ]);

        if (this._text)
            this.append([
                ContextMenuItem.create({
                    type: ContextMenuItemType.Text,
                    id: "text",
                    text: this._text})
            ]);

        this.setInlineCss({
            top: "0px",
            left: "0px"
        });

        if (this.getInlineCss()["display"] == "flex") {
            this._width = this.getHtmlElement().offsetWidth;
            this._height = this.getHtmlElement().offsetHeight;
        } else {
            this.setInlineCss({
                display: "flex",
                opacity: 0
            });

            this._width = this.getHtmlElement().offsetWidth;
            this._height = this.getHtmlElement().offsetHeight;

            this.setInlineCss({
                display: "none",
                opacity: 1
            });
        }

        this._stale = false;
    }

    private _onOwnerEnter(e: Event): void {
        this.raise(this.eventAboutToBeShown);

        if (this._stale)
            this._update();

        const mouseEvent = <MouseEvent> e;

        let Y = mouseEvent.clientY + 5;
        if (mouseEvent.clientY + this._height > window.innerHeight)
            Y = mouseEvent.clientY - this._height - 5;

        let X = mouseEvent.clientX + 3;
        if (mouseEvent.clientX + this._width > window.innerWidth)
            X = mouseEvent.clientX - this._width - 3;

        this.setInlineCss({
            display: "flex",
            top: `${Y}px`,
            left: `${X}px`
        });
    }

    private _onOwnerLeave(): void {
        this.setInlineCss({ display: "none" });
    }
}

Tooltip.style = {
    _: {
        background: Colors.tooltipBackgroundDefault,
        borderRadius: "4px",
        boxShadow: BoxShadowValues.contextMenu,
        display: "none",
        flexFlow: "column nowrap",
        alignItems: "stretch",
        position: "fixed",
        paddingTop: "4px",
        paddingBottom: "4px",
        maxWidth: "200px",
        pointerEvents: "none",
        textAlign: "left",
        wordWrap: "break-word",
        zIndex: ZIndexLayers.tooltip,
        whiteSpace: "normal"
    }
};
