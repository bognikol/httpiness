import { Div, CSS, NestedCSSProperties } from "aflon";

import { HttpAuth, HttpReqt, HttpCollection, HttpDir, HttpCollectionItem } from "../lib/http";
import { currentPlatform, Platform } from "../lib/Platform";
import { ZoomManager } from "../lib/WindowManipulation";

import { Colors, ZIndexLayers } from "./StyleConstants";
import { RequestBrowser } from "./RequestBrowser";
import { WorkspaceControl } from "./WorkspaceControl";
import { ControlBar } from "./ControlBar";
import { VResizer } from "./VResizer";
import { PreferenceStore } from "./PreferenceStore";
import { AppStatePersister } from "./AppStatePersister";

CSS.createRule("html, body", <NestedCSSProperties>{
    margin: 0,
    padding: 0,
    backgroundColor: Colors.backgroundDefault,
    userSelect: "none",
    width: "100%",
    height: "100%",
    "color-scheme": PreferenceStore.getColorTheme()
});

CSS.createRule("*", {
    boxSizing: "border-box"
});

CSS.createRule(".control-bar", <NestedCSSProperties>{
    "-webkit-app-region": "drag"
});

CSS.createRule("option", {
    background: Colors.tooltipBackgroundDefault,
    color: Colors.tooltipText
});

CSS.createRule("::selection", {
    backgroundColor: Colors.textSelection
});

if (currentPlatform() == Platform.Win32) {
    CSS.createRule("::-webkit-scrollbar", {
        width: "8px", height: "8px"
    });

    CSS.createRule("::-webkit-scrollbar-thumb", {
        background: Colors.scrollThumb
    });

    CSS.createRule("::-webkit-scrollbar-corner", {
        display: "none"
    });

    CSS.createRule("::-webkit-resizer", {
        display: "none"
    });
}

window.addEventListener("keydown", e => {
    const modifierKeyPressed =
        (currentPlatform() == Platform.MacOS && e.metaKey) ||
        (currentPlatform() != Platform.MacOS && e.ctrlKey);

    if (!modifierKeyPressed) return;

    if (e.key == "+" || e.key == "=") {
        e.preventDefault();
        ZoomManager.zoomIn();
    } else if (e.key == "-" || e.key == "_") {
        e.preventDefault();
        ZoomManager.zoomOut();
    }
});

PreferenceStore.on(PreferenceStore.eventColorThemeChanged, () => {
    setTimeout(() => location.reload(), 0);
});

export default class RapidsApp extends Div {
    private _workspaceControl: WorkspaceControl;
    private _httpRequestBrowser: RequestBrowser;
    private _reqBrowserSeparator: VResizer;
    private _controlBar: ControlBar;

    constructor() {
        super();

        this.append([
            (this._workspaceControl = new WorkspaceControl())
                .on(this._workspaceControl.eventActionRequested, e => this._onWorkspaceActionRequested(e)),
            (this._httpRequestBrowser = new RequestBrowser())
                .setInlineCss({ width: `${AppStatePersister.getRequestBrowserWidth()}px`})
                .on(this._httpRequestBrowser.eventItemSelected, e => this._onItemSelected(e))
                .on(this._httpRequestBrowser.eventItemPinSelected, e => this._onItemPinSelected(e))
                .on(this._httpRequestBrowser.eventReqtSendRequested, e => this._onReqtSendRequested(e))
                .on(this._httpRequestBrowser.eventItemAboutToBeDeleted, e => this._onItemAboutToBeDeleted(e))
                .on(this._httpRequestBrowser.eventClosingCollection, e => this._onClosingCollection(e)),
            (this._controlBar = new ControlBar()),
            (this._reqBrowserSeparator = new VResizer())
                .setResizingCallback(this._onBrowserResize)
        ]);
    }

    private _onBrowserResize = (e: MouseEvent): void => {
        let rect = this.getHtmlElement().getBoundingClientRect();
        let width = e.clientX - rect.left;
        AppStatePersister.setRequestBrowserWidth(width);
        this._httpRequestBrowser.setInlineCss({
            width: `${e.clientX - rect.left}px`
        });
    };

    private _onItemSelected(e: Event): void {
        let request = <HttpReqt>(e["detail"]["item"]);
        let makeNameEditable = <boolean>(e["detail"]["makeWorkspaceNameEditable"]);
        this._workspaceControl.setPreviewItem(request, makeNameEditable);
    }

    private _onItemPinSelected(e: Event): void {
        let colItem = <HttpCollectionItem>(e["detail"]["item"]);
        this._workspaceControl.addPinnedItem(colItem);
    }

    private async _onReqtSendRequested(e: Event): Promise<void> {
        let reqt = <HttpCollectionItem>(e["detail"]["item"]);
        if (!(reqt instanceof HttpReqt))
            throw new Error("Payload of eventReqtSendRequested in not HttpReqt.");
        this._workspaceControl.sendRequest(reqt);
    }

    private _onClosingCollection(e: Event): void {
        let collection = <HttpCollection>(e["detail"]["collection"]);
        this._workspaceControl.closeAllItemsFromCollection(collection);
    }

    private _onWorkspaceActionRequested(e: Event): void {
        let action = e["detail"]["action"];

        if (action == "send-request") {
            this._httpRequestBrowser.loadSampleRequest();
            return;
        }

        if (action == "create") {
            this._httpRequestBrowser.createCollection();
            return;
        }

        if (action == "import") {
            this._httpRequestBrowser.importCollection();
            return;
        }

        if (action == "docs") {
            this._controlBar.showHelp();
            return;
        }
    }

    private _onItemAboutToBeDeleted(e: Event): void {
        let details = e["detail"];

        if (details["item"] && (details["item"] instanceof HttpReqt || details["item"] instanceof HttpAuth)) {
            this._workspaceControl.closeItem(details["item"]);
            return;
        }

        if (details["item"] && details["item"] instanceof HttpDir) {
            this._workspaceControl.closeAllDescendantsOf(details["item"]);
            return;
        }
    }
}

RapidsApp.style = {
    _: {
        fontSize: "20px",
        fontWeight: "bolder",
        fontFamily: "Open Sans",
        display: "grid",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        grid:
            `"header  header    header" 38px
             "browser separator viewer" 1fr
            / auto    0px       1fr`
    },
    _reqBrowserSeparator: {
        gridArea: "separator",
        zIndex: ZIndexLayers.base + 1
    },
    _httpRequestBrowser: {
        gridArea: "browser",
        width: "300px",
        minWidth: "300px",
        maxWidth: "500px"
    },
    _workspaceControl: {
        gridArea: "viewer"
    },
    _controlBar: {
        gridArea: "header"
    }
};
