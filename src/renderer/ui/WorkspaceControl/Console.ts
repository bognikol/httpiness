import { Div, Animation } from "aflon";

import { BoxShadowValues, Colors, FontStyles, ZIndexLayers } from "../StyleConstants";
import { Icon } from "../Icon";
import { Tooltip } from "../ContextMenu";
import { PreferenceStore } from "../PreferenceStore";
import { RequestExecutionHistoryControl, ResponsePanelOptionsButton } from "../ExecutionHistoryControl";
import { HttpResponseControl } from "../ExecutionHistoryControl/HttpResponseControl";


export class Console extends Div {
    private _background: Div;
    private _console: Div;
    private _consoleHeader: Div;
    private _headerTitle: Div;
    private _headerPlaceholder: Div;
    private _headerResponseOptionsButton: ResponsePanelOptionsButton;
    private _headerSearchButton: Div;
    private _headerClearHistoryButton: Div;
    private _headerCollapseButton: Div;
    private _consoleContent: Div;
    private _history: RequestExecutionHistoryControl;
    private _responseControl: HttpResponseControl;

    private _showAnimation: Animation = null;
    private _hideAnimation: Animation = null;

    private _mouseEntered: boolean = false;

    constructor() {
        super();

        this.append([
            (this._background = new Div())
                .on(this._background.eventClick, () => this._onBackgroundClick())
                .on(this._background.eventMouseEnter, () => this._onConsoleMouseLeave()),
            (this._console = new Div())
                .append([
                    (this._consoleHeader = new Div())
                        .append([
                            (this._headerTitle = new Div())
                                .setText("Responses & History")
                                .on(this._consoleHeader.eventClick, () => this._onConsoleHeaderClick()),
                            (this._headerPlaceholder = new Div()),
                            (this._headerResponseOptionsButton = new ResponsePanelOptionsButton()),
                            (this._headerSearchButton = new Div())
                                .append([ new Icon("search") ])
                                .on(this._headerSearchButton.eventClick, () => this._responseControl.activateSearch()),
                            (this._headerClearHistoryButton = new Div())
                                .append([ new Icon("clear") ])
                                .on(this._headerClearHistoryButton.eventClick, () => this._history.clear()),
                            (this._headerCollapseButton = new Div())
                                .append([ new Icon("minimize") ])
                                .on(this._headerCollapseButton.eventClick, () => this.hide())
                        ]),
                    (this._consoleContent = new Div())
                ])
                .on(this._background.eventMouseEnter, () => this._onConsoleMouseEnter())
        ]);

        new Tooltip(this._headerSearchButton).setText("Search response");
        new Tooltip(this._headerClearHistoryButton).setText("Clear history");
        new Tooltip(this._headerCollapseButton).setText("Collapse console");

        window.addEventListener("resize", this._onDocumentResize);
        document.addEventListener("beforeunload", this._onDocumentBeforeUnload);
        document.addEventListener("keydown", this._onKeyDown);
    }

    setContent(historyControl: RequestExecutionHistoryControl, responseControl: HttpResponseControl): this {
        this._history = historyControl;
        this._responseControl = responseControl;

        this._history.setInlineCss({
            flex: "0 0 300px",
            borderRight: `solid 1px ${Colors.workspaceLine}`
        });

        this._responseControl.setInlineCss({
            flex: "1 1 1px",
            height: "100%",
            minWidth: "0"
        });

        this._consoleContent.append([ this._history, this._responseControl ]);

        return this;
    }

    clearContent(): this {
        if (this._consoleContent.children().includes(this._history))
            this._consoleContent.removeChild(this._history);
        if (this._consoleContent.children().includes(this._responseControl))
            this._consoleContent.removeChild(this._responseControl);
        return this;
    }

    public show(): this {
        if (this._showAnimation)
            this._showAnimation.stop();

        this._showAnimation = new Animation({
            animations: [
                { target: "_console", track: "height", to: `${document.documentElement.clientHeight - 60}px` },
                { target: "_console", track: "width", to: `${document.documentElement.clientWidth - 120}px` },
                { target: "_console", track: "boxShadow", to: BoxShadowValues.consoleExtended },
                { target: "_consoleContent", track: "display", to: "flex", delay: 200 },
                { target: "_background", track: "display", to: "block" },
                { target: "_headerResponseOptionsButton", track: "display", to: "block" },
                { target: "_headerSearchButton", track: "display", to: "block" },
                { target: "_headerClearHistoryButton", track: "display", to: "block" },
                { target: "_headerCollapseButton", track: "display", to: "block" }
            ],
            ease: "circOut",
            duration: 100
        }, this);

        if (this._hideAnimation) {
            this._hideAnimation.stop();
        }

        this._showAnimation.start();

        return this;
    }

    public hide(): this {
        if (!this._hideAnimation) {
            this._hideAnimation = new Animation({
                animations: [
                    { target: "_console", track: "height", to: "35px" },
                    { target: "_console", track: "width", to: "145px" },
                    { target: "_console", track: "boxShadow", to: BoxShadowValues.consoleCollapsed },
                    { target: "_consoleContent", track: "display", to: "none" },
                    { target: "_background", track: "display", to: "none" },
                    { target: "_headerResponseOptionsButton", track: "display", to: "none" },
                    { target: "_headerSearchButton", track: "display", to: "none" },
                    { target: "_headerClearHistoryButton", track: "display", to: "none" },
                    { target: "_headerCollapseButton", track: "display", to: "none" }
                ],
                ease: "circOut",
                duration: 200
            }, this);
        }

        if (this._showAnimation) {
            this._showAnimation.stop();
        }

        this._hideAnimation.stop();
        this._hideAnimation.start();

        this._mouseEntered = false;

        return this;
    }

    private _onConsoleHeaderClick(): void {
        this.show();
    }

    private _onBackgroundClick(): void {
        this.hide();
    }

    private _onConsoleMouseEnter(): void {
        this._mouseEntered = true;
    }

    private _onConsoleMouseLeave(): void {
        if (!this._mouseEntered) return;

        let closeOneMouseLeave = PreferenceStore.getCloseConsoleOnMouseLeave();

        if (!closeOneMouseLeave) return;
        this.hide();
    }

    private _onDocumentResize = (): void => {
        this.hide();
    };

    private _onDocumentBeforeUnload = (): void => {
        window.removeEventListener("resize", this._onDocumentResize);
        document.removeEventListener("beforeunload", this._onDocumentBeforeUnload);
        document.removeEventListener("keydown", this._onKeyDown);
    };

    private _onKeyDown = (e:Event): void => {
        const keyEvent = <KeyboardEvent>e;

        if (keyEvent.key == "Escape")
            this.hide();
    };
}

Console.style = {
    _: {
    },
    _background: {
        position: "fixed",
        opacity: 0,
        height: "100vh",
        width: "100vw",
        top: 0,
        left: 0,
        zIndex: ZIndexLayers.consoleBackground,
        display: "none"
    },
    _console: {
        position: "fixed",
        bottom: 0,
        height: "35px",
        width: "145px",
        left: 0,
        right: 0,
        margin: "auto",
        zIndex: ZIndexLayers.console,
        background: Colors.consoleBackground,
        border: `solid 1px ${Colors.consoleBorder}`,
        borderBottom: "none",
        boxShadow: BoxShadowValues.consoleCollapsed,
        display: "flex",
        flexFlow: "column nowrap",
        borderRadius: "8px 8px 0 0",
        "&:focus": {
            border: `solid 1px ${Colors.consoleBorder}`,
            borderBottom: "none",
            outline: "none"
        }
    },
    _consoleHeader: {
        flex: "0 0 35px",
        color: Colors.consoleDominant,
        ...FontStyles.sansSerifBold,
        fontSize: "12px",
        lineHeight: "35px",
        paddingLeft: "10px",
        paddingRight: "5px",
        borderBottom: `solid 1px ${Colors.workspaceLine}`,
        display: "flex",
        flexFlow: "row nowrap"
    },
    _headerPlaceholder: {
        flex: "1 1 1px"
    },
    _headerResponseOptionsButton: {
        height: "100%",
        width: "30px",
        display: "none"
    },
    _headerSearchButton: {
        fontSize: "15px",
        display: "none",
        alignContent: "center",
        alignItems: "center",
        height: "100%",
        width: "30px",
        paddingLeft: "2px",
        paddingTop: "2px",
        textAlign: "center",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _headerClearHistoryButton: {
        display: "none",
        alignContent: "center",
        alignItems: "center",
        height: "100%",
        width: "30px",
        paddingLeft: "2px",
        paddingTop: "2px",
        textAlign: "center",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _headerCollapseButton: {
        display: "none",
        alignContent: "center",
        alignItems: "center",
        height: "100%",
        width: "27px",
        paddingTop: "2px",
        textAlign: "center",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _consoleContent: {
        flex: "1 1 1px",
        display: "none",
        minHeight: "0",
        flexFlow: "row nowrap"
    }
};
