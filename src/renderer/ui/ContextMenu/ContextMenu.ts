import { Div, Element } from "aflon";

import { ISimpleEventable, SimpleEventBroker, SimpleEventListener } from "../../lib/SimpleEvent";

import { BoxShadowValues, Colors, ZIndexLayers } from "../StyleConstants";

import { ContextMenuItem, ContextMenuItemDefinition } from "./ContextMenuItem";

export enum ContextMenuShowTrigger {
    OnContextMenuEvent, OnClickEvent
}

export class ContextMenu implements ISimpleEventable {
    public eventSelected = "selected";
    public eventAboutToBeShown = "aboutToBeShown";

    private _owner: Element;
    private _items: Array<ContextMenuItemDefinition>;
    private _eventBroker: SimpleEventBroker = new SimpleEventBroker(this);
    private _maxWidth: number = 0;

    constructor(owner: Element, items: Array<ContextMenuItemDefinition>,
        trigger: ContextMenuShowTrigger = ContextMenuShowTrigger.OnContextMenuEvent, maxWidth: number = 0) {

        this._owner = owner;
        this._items = items;
        this._maxWidth = maxWidth;

        if (trigger == ContextMenuShowTrigger.OnContextMenuEvent)
            this._owner.on(this._owner.eventContextMenu, e => this._onOwnerContextMenu(e));
        else if (trigger == ContextMenuShowTrigger.OnClickEvent)
            this._owner.on(this._owner.eventClick, e => this._onOwnerContextMenu(e));
        else
            throw new Error(`ContextMenuShowTrigger ${trigger} is not supported.`);
    }

    private static _findItemWithId(items: Array<ContextMenuItemDefinition>, id: string): ContextMenuItemDefinition {

        for (let item of items) {
            if (item.id == id) return item;
            if (item.submenu) {
                let result = this._findItemWithId(item.submenu, id);
                if (result) return result;
            }
        }

        return null;
    }

    getOwner(): Element {
        return this._owner;
    }

    setItemDisabled(itemId: string, disabled: boolean): this {
        const item = ContextMenu._findItemWithId(this._items, itemId);
        if (!item) return this;
        item.disabled = disabled;

        return this;
    }

    getItemDisabled(itemId: string): boolean {
        const item = ContextMenu._findItemWithId(this._items, itemId);
        if (!item) return false;
        return item.disabled;
    }

    setChecked(itemId: string, checked: boolean): this {
        const item = ContextMenu._findItemWithId(this._items, itemId);
        if (!item) return this;
        item.checked = checked;

        return this;
    }

    getChecked(itemId: string): boolean {
        const item = ContextMenu._findItemWithId(this._items, itemId);
        if (!item) return false;
        return item.checked;
    }

    setText(itemId: string, text: string): this {
        const item = ContextMenu._findItemWithId(this._items, itemId);
        if (!item) return this;
        item.text = text;

        return this;
    }

    getText(itemId: string): string {
        const item = ContextMenu._findItemWithId(this._items, itemId);
        if (!item) return "";
        return item.text;
    }

    setDefinition(items: Array<ContextMenuItemDefinition>): this {
        this._items = items;
        return this;
    }

    getDefinition(): Array<ContextMenuItemDefinition> {
        return this._items;
    }

    on(eventName: string, handler: SimpleEventListener): this {
        this._eventBroker.on(eventName, handler);
        return this;
    }

    off(eventName: string, handler: SimpleEventListener): this {
        this._eventBroker.off(eventName, handler);
        return this;
    }

    raise(eventName: string, args: Record<string, unknown> = {}): void {
        this._eventBroker.raise(eventName, args);
    }

    private async _onOwnerContextMenu(e: Event): Promise<void> {
        e.preventDefault();

        const mouseEvent = <MouseEvent>e;
        this.raise(this.eventAboutToBeShown);

        let result = await ContextMenuElement.show(this._items, [ mouseEvent.clientX, mouseEvent.clientY ], this._maxWidth);

        if (result)
            this.raise(this.eventSelected, { id: result });
    }
}

export class ContextMenuRun extends Div {
    private _onContextMenuItemButtonClickHandler: (e:Event) => void;

    show(items: Array<ContextMenuItemDefinition>, x: number, y: number, onContextMenuItemButtonClickHandler: (e:Event) => void, maxWidth: number = 0): void {
        this._onContextMenuItemButtonClickHandler = onContextMenuItemButtonClickHandler;

        this.append(items.map(item => {
            let cmElem = ContextMenuItem.create(item);
            cmElem.on(cmElem.eventItemSelected, this._onContextMenuItemButtonClickHandler);
            return cmElem;
        }));

        if (maxWidth != 0) {
            this.setInlineCss({ maxWidth: `${maxWidth}px` });
        }

        this.setInlineCss({
            top: "0px",
            left: "0px",
            display: "flex",
            opacity: 0
        });

        // We need to invoke querying of size async as engine
        // needs some time to render invisible element.
        setTimeout(() => {
            let width = this.getHtmlElement().offsetWidth;
            let height = this.getHtmlElement().offsetHeight;

            let windowHeight = window.innerHeight;
            let windowWidth = window.innerWidth;

            let Y = Math.max(y - 6, 6);
            if (Y + height > windowHeight - 12)
                Y = Math.max(y - height - 6, 6);
            if (Y + height > windowHeight - 12) {
                Y = 6;
                height = windowHeight - 12;
            }

            if (Y < 0) {
                Y = 0;
                height = windowHeight;
            }

            let X = x + 2;
            if (x + width > windowWidth)
                X = x - width - 2;

            this.setInlineCss({
                top: `${Y}px`,
                left: `${X}px`,
                height: `${height}px`,
                opacity: 1
            });
        }, 0);
    }
}

ContextMenuRun.style = {
    _: {
        background: Colors.tooltipBackgroundDefault,
        borderRadius: "6px",
        boxShadow: BoxShadowValues.contextMenu,
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "stretch",
        position: "fixed",
        paddingTop: "6px",
        paddingBottom: "6px",
        maxWidth: "250px",
        zIndex: ZIndexLayers.context,
        overflowX: "scroll",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    }
};

class ContextMenuElement extends Div {
    private static _instance: ContextMenuElement = null;

    private constructor() {
        super();
    }

    static initialize(): void {
        if (ContextMenuElement._instance != null) return;
        ContextMenuElement._instance = new ContextMenuElement();
        document.body.appendChild(ContextMenuElement._instance.getHtmlElement());
    }

    static async show(items: Array<ContextMenuItemDefinition>, mouseLocation: [number, number], maxWidth: number = 0): Promise<string> {
        return new Promise<string>((resolve) => {
            let selectedItemId = "";

            const onDocumentClick = (): void => {
                resolve(selectedItemId);
                document.removeEventListener("mousedown", onDocumentClick);
                ContextMenuElement._instance.empty();
            };

            const onContextMenuItemButtonClick = (e: Event): void => {
                selectedItemId = e["detail"]["id"];
            };
            let run = new ContextMenuRun();
            ContextMenuElement._instance.append([ run ]);
            run.show(items, mouseLocation[0], mouseLocation[1], onContextMenuItemButtonClick, maxWidth);

            document.addEventListener("mousedown", onDocumentClick);
        });
    }
}

ContextMenuElement.initialize();
