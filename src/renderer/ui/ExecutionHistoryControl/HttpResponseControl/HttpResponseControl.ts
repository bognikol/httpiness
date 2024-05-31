import { Div } from "aflon";

import { HttpExecution, HttpReqt } from "../../../lib/http";
import { currentPlatform, Platform } from "../../../lib/Platform";

import { HttpHeadersControl } from "../../HttpRequestControl/HttpHeadersControl";
import { PreferenceStore } from "../../PreferenceStore";
import { Colors, ZIndexLayers } from "../../StyleConstants";

import { SearchToolbox } from "./SearchToolbox";
import { HttpResponseBodyControl } from "./HttpResponseBodyControl";
import { HttpStatusAndMetadataControl } from "./HttpStatusAndMetadataControl";

export class HttpResponseControl extends Div {
    eventHistoryRequested: string = "historyRequested";

    private _progressBar: Div;
    private _statusAndExecutionControl: HttpStatusAndMetadataControl;
    private _searchBoxVisibilityWrapper: Div;
    private _searchToolbox: SearchToolbox;
    private _headersAndBody: Div;
    private _headersControl: HttpHeadersControl;
    private _bodyControl: HttpResponseBodyControl;

    private _httpExecution: HttpExecution;

    constructor() {
        super();

        this.append([
            (this._progressBar = new Div()),
            (this._statusAndExecutionControl = new HttpStatusAndMetadataControl())
                .on(this._statusAndExecutionControl.eventHistoryRequested, () => this.raise(this.eventHistoryRequested))
                .on(this._statusAndExecutionControl.eventSearchActivationRequested, () => this.activateSearch()),
            (this._headersAndBody = new Div())
                .append([
                    (this._headersControl = new HttpHeadersControl())
                        .setDescriptorShown(!PreferenceStore.getHideResponseDescriptor())
                        .setVisibility(false)
                        .setReadOnly(true)
                        .setExpanded(false),
                    (this._bodyControl = new HttpResponseBodyControl())
                        .setDescriptorShown(!PreferenceStore.getHideResponseDescriptor())
                        .setVisibility(false)
                        .on(this._bodyControl.eventSearchResultsUpdated, e => this._onSearchResultsUpdated(e))
                ]),
            (this._searchBoxVisibilityWrapper = new Div())
                .setVisibility(false)
                .append([
                    (this._searchToolbox = new SearchToolbox())
                        .setVisibility(false)
                        .on(this._searchToolbox.eventSearchParamsChanged, e => this.setSearchPhrase(e["detail"]["text"]))
                        .on(this._searchToolbox.eventFocusNextResult, () => this.searchFocusNext())
                        .on(this._searchToolbox.eventFocusPreviousResult, () => this.searchFocusPrevious())
                ])
        ]);
    }

    clear(): this {
        this.setExecution(null, null);
        this.animations("stop").stop();
        this.animations("start").stop();
        this.animations("start").toBegining();
        return this;
    }

    setExecution(reqt: HttpReqt, httpExecution: HttpExecution): this {
        this._httpExecution = httpExecution;

        this._statusAndExecutionControl.setExecution(reqt, httpExecution);

        this.animations("end").stop();
        this.animations("start").stop();

        if (!this._httpExecution) {
            this.animations("start").start();
            this._searchBoxVisibilityWrapper.setVisibility(false);
            this._headersControl.setVisibility(false);
            this._bodyControl.setVisibility(false);
            return this;
        }

        this.animations("end").start();

        const { response } = this._httpExecution;

        if (response) {
            this._searchBoxVisibilityWrapper.setVisibility(true);
            this._headersControl.setVisibility(true);
            this._bodyControl.setVisibility(true);
            this._headersControl.setHeaders(response.headers);
            this._bodyControl.setBody(response.body, reqt.getContainingCollection());
        } else {
            this._searchBoxVisibilityWrapper.setVisibility(false);
            this._headersControl.setVisibility(false);
            this._bodyControl.setVisibility(false);
        }

        return this;
    }

    setSearchPhrase(phrase: string): this {
        this._bodyControl.setSearchPhrase(phrase);
        return this;
    }

    getSearchPhrase(): string {
        return this._bodyControl.getSearchPhrase();
    }

    searchFocusNext(): this {
        this._bodyControl.searchFocusNext();
        return this;
    }

    searchFocusPrevious(): this {
        this._bodyControl.searchFocusPrevious();
        return this;
    }

    activateSearch(): this {
        if (this._httpExecution == null || this._httpExecution.response == null) return this;
        this._searchToolbox.activate();
        return this;
    }

    setCompactHeader(compact: boolean): this {
        this._statusAndExecutionControl.setExpanded(!compact);

        if (compact) {
            this._searchToolbox.setInlineCss({
                top: "39px",
                background: Colors.consoleBackground
            });
        } else {
            this._searchToolbox.setInlineCss({
                top: "75px",
                background: Colors.backgroundDefault
            });
        }

        return this;
    }

    getCompactHeader(): boolean {
        return !this._statusAndExecutionControl.getExpanded();
    }

    protected _onEnteringDom(): void {
        document.addEventListener("keydown", this._onKeyDown);
        PreferenceStore
            .on(PreferenceStore.eventHideResponseDescriptorChanged, this._onHideResponseDescriptorChanged);
    }

    protected _onLeavingDom(): void {
        document.removeEventListener("keydown", this._onKeyDown);
        PreferenceStore
            .off(PreferenceStore.eventHideResponseDescriptorChanged, this._onHideResponseDescriptorChanged);
    }

    private _onSearchResultsUpdated(e: Event): void {
        this._searchToolbox.setResultNumber(e["detail"]["numberOfFoundPhrases"]);
    }

    private _onHideResponseDescriptorChanged = (): void => {
        let descriptorsShown = !PreferenceStore.getHideResponseDescriptor();

        this._headersControl.setDescriptorShown(descriptorsShown);
        this._bodyControl.setDescriptorShown(descriptorsShown);
    };

    private _onKeyDown = (e: Event): void => {
        if (this.getHtmlElement().offsetParent == null) return;

        let keyEvent = <KeyboardEvent>e;

        const modifierKeyPressed =
            (currentPlatform() == Platform.MacOS && keyEvent.metaKey) ||
            (currentPlatform() != Platform.MacOS && keyEvent.ctrlKey);

        if (keyEvent.key.toUpperCase() == "F" && modifierKeyPressed) {
            if (this._httpExecution != null && this._httpExecution.response != null) {
                this._searchToolbox.activate();
            }
        }
    };
}

HttpResponseControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        position: "relative",
        overflowX: "hidden"
    },
    _progressBar: {
        width: "0%",
        minHeight: "2px",
        maxHeight: "2px",
        marginBottom: "-2px",
        background: Colors.workspaceAccent,
        zIndex: ZIndexLayers.console + 1
    },
    _status: {
        flex: "0 0 35px"
    },
    _statusAndExecutionControl: {
        flex: "0 0 content"
    },
    _searchToolbox: {
        position: "absolute",
        top: "0",
        right: "20px"
    },
    _headersAndBody: {
        position: "relative",
        display: "flex",
        flexFlow: "column nowrap",
        flex: "1 1 1px",
        maxWidth: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        paddingTop: "20px",
        "&::-webkit-scrollbar": {
            borderLeft: `solid 1px ${Colors.workspaceLine}`,
            width: "10px"
        },
        "&::-webkit-scrollbar-thumb": {
            background: Colors.scrollThumb,
            opacity: 1.0,
            border: `solid 1px ${Colors.workspaceLine}`,
            borderRight: "none"
        }
    },
    _headersControl: {
        marginBottom: "20px",
        maxWidth: "100%"
    },
    _bodyControl: {
        maxWidth: "100%",
        flex: "1 1 content"
    }
};

HttpResponseControl.animations = {
    start: {
        animations: [
            { target: "_progressBar", track: "width", from: "0%", to: "70%", duration: 10000, ease: "circOut" },
            { target: "_progressBar", track: "opacity", to: 1, duration: 1 }
        ]
    },
    end: {
        animations: [
            { target: "_progressBar", track: "width", to: "100%", duration: 200, ease: "circOut" },
            { target: "_progressBar", track: "opacity", to: 0, delay: 150, duration: 200}
        ]
    }
};
