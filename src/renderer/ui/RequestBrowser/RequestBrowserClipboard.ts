import { BrowserAuthItem } from "./BrowserAuthItem";
import { BrowserDirItem }     from "./BrowserDirItem";
import { BrowserRequestItem } from "./BrowserRequestItem";

export enum RequestBrowserClipboardAction {
    Cut, Copy, None
}

export type BrowserItem = BrowserDirItem | BrowserRequestItem | BrowserAuthItem;

export class RequestBrowserClipboard {
    private static _value: BrowserItem = null;
    private static _action: RequestBrowserClipboardAction = RequestBrowserClipboardAction.None;

    static setValueToCopy(item: BrowserItem): void {
        RequestBrowserClipboard._value = item;
        RequestBrowserClipboard._action = RequestBrowserClipboardAction.Copy;
    }

    static setValueToCut(item: BrowserItem): void {
        RequestBrowserClipboard._value = item;
        RequestBrowserClipboard._action = RequestBrowserClipboardAction.Cut;
    }

    static getValue(): BrowserItem {
        return RequestBrowserClipboard._value;
    }

    static getAction(): RequestBrowserClipboardAction {
        return RequestBrowserClipboard._action;
    }

    static clearValue(): void {
        RequestBrowserClipboard._value = null;
        RequestBrowserClipboard._action = RequestBrowserClipboardAction.None;
    }
}
