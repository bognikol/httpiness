import { Div } from "aflon";
import { HttpCollectionItem } from "../../../lib/http";

// WItem is short for WorkspaceITEM

export abstract class WItem extends Div {
    public eventSendRequested = "sendRequested";
    public eventCloseRequested = "closeRequested";
    public eventCollectionItemChanged = "collectionItemChanged";

    abstract getMacroNames(): Array<string>;
    abstract setExpanded(expanded: boolean): this;
    abstract getExpanded(): boolean;
    abstract pin(): this;
    abstract isPinned(): boolean;
    abstract focusName(): this;
    abstract setItem(item: HttpCollectionItem): this
    abstract getItem(): HttpCollectionItem;
}
