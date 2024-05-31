import { Div, getAflonTarget, Animation } from "aflon";

import { error } from "../../lib/Logger";
import { HttpAuth, HttpReqt, HttpCollection, HttpCollectionItem, HttpDir } from "../../lib/http";

import { BoxShadowValues, Colors, ZIndexLayers } from "../StyleConstants";
import { VResizer } from "../VResizer";
import { AppStatePersister } from "../AppStatePersister";
import { RequestExecutionHistoryControl, HttpResponseControl } from "../ExecutionHistoryControl";
import { PreferenceStore, ResponseControlLocation } from "../PreferenceStore";

import { HttpReqtWitem, WItem, HttpAuthWitem } from "./WItem";
import { MacrosControl, MacrosFromCollection } from "./MacrosControl";
import { WelcomeControl } from "./WelcomeControl";
import { Console } from "./Console";

export class WorkspaceControl extends Div {
    public eventActionRequested = "actionRequested";

    private _innerWorkspace: Div;
    private _welcomeControl: WelcomeControl;
    private _reqtItems: Div;
    private _parametersResizer: VResizer;
    private _parameters: MacrosControl;
    private _historyHost: Div;
    private _history: RequestExecutionHistoryControl;
    private _responseControl: HttpResponseControl;
    private _console: Console;

    private _responseWithinWorkspace: boolean = false;
    private _parametersAnimation: Animation = null;

    constructor() {
        super();

        (this._history = new RequestExecutionHistoryControl())
            .on(this._history.eventExecutionSelected, this._onExecutionSelected);
        (this._responseControl = new HttpResponseControl())
            .on(this._responseControl.eventHistoryRequested, () => this._onResponseControlHistoryRequested())
            .setCompactHeader(true);

        this.append([
            (this._innerWorkspace = new Div())
                .append([
                    (this._welcomeControl = new WelcomeControl())
                        .on(this._welcomeControl.eventActionRequested, e => this.raise(this.eventActionRequested, e["detail"])),
                    (this._reqtItems = new Div()),
                    (this._historyHost = new Div())
                        .on(this._historyHost.eventMouseLeave, () => this._hideHistoryHost())
                        .on(this._historyHost.eventClick, () => this._hideHistoryHost())
                ]),
            (this._parametersResizer = new VResizer())
                .setResizingCallback(this._onParametersResize),
            (this._parameters = new MacrosControl())
                .setInlineCss({ flex: `0 0 ${AppStatePersister.getParametersWidth()}px` })
                .on(this._parameters.eventMouseEnter, () => this._onParametersMouseEnter())
                .on(this._parameters.eventMouseLeave, () => this._onParametersMouseLeave()),
            (this._console = new Console())
                .setContent(this._history, this._responseControl)
        ]);

        this._updateResponseLocation();
        this._updateWelcomeControlVisibility();
    }

    setPreviewItem(item: HttpCollectionItem, makeNameEditable: boolean = false, collapseAllItems: boolean = true): this {
        if (collapseAllItems)
            this._collapseAllItems();

        let previewControl = this._getPreviewWorkspaceItem();
        let pinnedControl = this._getPinnedWorkspaceItem(item);

        if (pinnedControl) {
            if (previewControl) {
                this._removeWorkspaceItem(previewControl);
            }
            pinnedControl.setExpanded(true);
            pinnedControl.getHtmlElement().scrollIntoView();
        } else {
            let workspaceItemIsOfRightType =
                (item instanceof HttpReqt && previewControl instanceof HttpReqtWitem) ||
                (item instanceof HttpAuth && previewControl instanceof HttpAuthWitem);

            if (previewControl && workspaceItemIsOfRightType) {
                previewControl.setItem(item);
                previewControl.getHtmlElement().scrollIntoView();
                if (makeNameEditable)
                    previewControl.focusName();
            } else {
                if (previewControl)
                    this._removeWorkspaceItem(previewControl);

                this._createAndAddWorkspaceItem(item, false, makeNameEditable);
            }
        }

        this._updateMacrosControl();
        this._updateWelcomeControlVisibility();

        return this;
    }

    addPinnedItem(item: HttpCollectionItem): this {
        this._collapseAllItems();

        let previewControl = this._getPreviewWorkspaceItem();

        if (previewControl) {
            if (previewControl.getItem() == item) {
                previewControl.pin();
                return this;
            }

            this._removeWorkspaceItem(previewControl);
        }

        let pinnedControl = this._getPinnedWorkspaceItem(item);

        if (pinnedControl) {
            pinnedControl.setExpanded(true);
            pinnedControl.getHtmlElement().scrollIntoView();
            return this;
        }

        this._createAndAddWorkspaceItem(item);

        this._updateMacrosControl();
        this._updateWelcomeControlVisibility();

        return this;
    }

    closeAllItemsFromCollection(collection: HttpCollection): this {
        this._reqtItems.children()
            .filter(child =>
                child instanceof WItem &&
                child.getItem().getContainingCollection() == collection)
            .forEach(child => this._removeWorkspaceItem(<HttpReqtWitem>child));

        this._updateMacrosControl();
        this._updateWelcomeControlVisibility();

        return this;
    }

    closeItem(item: HttpCollectionItem): this {
        this._reqtItems.children()
            .filter(child =>
                child instanceof WItem &&
                child.getItem() == item)
            .forEach(child => this._removeWorkspaceItem(<HttpReqtWitem>child));

        this._updateMacrosControl();
        this._updateWelcomeControlVisibility();

        return this;
    }

    closeAllDescendantsOf(dir: HttpDir): this {
        this._reqtItems.children()
            .filter(child =>
                child instanceof WItem &&
                dir.isAscendantOf(child.getItem()))
            .forEach(child => this._removeWorkspaceItem(<WItem>child));

        this._updateMacrosControl();
        this._updateWelcomeControlVisibility();

        return this;
    }

    sendRequest(reqt: HttpReqt): void {
        this.setPreviewItem(reqt);
        this._history.push(reqt);
        if (this._console.getVisibility())
            this._console.show();
    }

    protected _onEnteringDom(): void {
        window.addEventListener("beforeunload", this._onBeforeUnload);
        PreferenceStore.on(PreferenceStore.eventResponseLocationChanged, this._onResponseLocationChanged);
        PreferenceStore.on(PreferenceStore.eventAutoHideParametersChanged, this._updateParametersAutoHide);
        visualViewport.addEventListener("resize", this._onViewportResize);
    }

    protected _onLeavingDom(): void {
        PreferenceStore.off(PreferenceStore.eventResponseLocationChanged, this._onResponseLocationChanged);
        PreferenceStore.off(PreferenceStore.eventAutoHideParametersChanged, this._updateParametersAutoHide);
        visualViewport.removeEventListener("resize", this._onViewportResize);
    }

    private _showHistoryHost(): void {
        this.animations("hide").stop();
        this.animations("show").start();
    }

    private _hideHistoryHost(): void {
        this.animations("show").stop();
        this.animations("hide").start();
    }

    private _expandParameters(): void {
        if (this._parametersAnimation != null)
            this._parametersAnimation.stop();

        this._parametersAnimation = new Animation({
            animations: [{ track: "marginRight", to: 0, ease: "circOut", duration: 150 }]
        }, this);
        this._parametersAnimation.start();
    }

    private _collapseParameters(): void {
        if (this._parametersAnimation != null)
            this._parametersAnimation.stop();

        let rightMargin = this._parameters.getHtmlElement().getBoundingClientRect().width - 50;

        this._parametersAnimation = new Animation({
            animations: [{ track: "marginRight", to: `-${rightMargin}px`, ease: "circOut", duration: 150 }]
        }, this);
        this._parametersAnimation.start();
    }

    private _onParametersMouseEnter(): void {
        if (!PreferenceStore.getAutoHideParameters()) return;
        this._expandParameters();
    }

    private _onParametersMouseLeave(): void {
        if (!PreferenceStore.getAutoHideParameters()) return;
        this._collapseParameters();
    }

    private _moveResponseControl(withinWorkspace: boolean): void {
        if (this._responseWithinWorkspace == withinWorkspace) return;
        this._responseWithinWorkspace = withinWorkspace;

        if (this._responseWithinWorkspace) {
            this._console.clearContent();
            this._reqtItems.insertAfter(this._responseControl);
            this._responseControl.setCompactHeader(false);
            this._reqtItems.setInlineCss({
                flex: "0 0 50%"
            });
            this._responseControl.setInlineCss({
                borderLeft: `1px solid ${Colors.workspaceLine}`,
                flex: "0 0 50%"
            });
            this._historyHost.append([ this._history ]);
            this._history.setInlineCss({ borderRight: "none" });
            this._console.setVisibility(false);
            this._updateParametersAutoHide();
            return;
        }

        this._responseControl.setVisibility(true);
        this._responseControl.setCompactHeader(true);
        this._historyHost.removeChild(this._history);
        this._history.setInlineCss({ borderRight: "initial" });
        this._reqtItems.setInlineCss({
            flex: "0 0 100%"
        });
        this._responseControl.setInlineCss({
            borderLeft: "none",
            flex: "auto"
        });
        this._innerWorkspace.removeChild(this._responseControl);
        this._console.setContent(this._history, this._responseControl);
        this._console.setVisibility(true);
        this._updateParametersAutoHide();
    }

    private _onParametersResize = (e: MouseEvent): void => {
        let x = e.clientX;
        let { left, width } = this._parameters.getHtmlElement().getBoundingClientRect();

        width = left - x + width;

        AppStatePersister.setParametersWidth(width);

        this._parameters.setInlineCss({
            flex: `0 0 ${width}px`
        });
    };

    private _collapseAllItems(): void {
        this._reqtItems.children()
            .forEach(child => {
                if (child instanceof WItem && child.isPinned())
                    child.setExpanded(false);
            });
    }

    private _updateWelcomeControlVisibility(): void {
        if (this._reqtItems.children().length == 0) {
            this._welcomeControl.setVisibility(true);
            this._reqtItems.setVisibility(false);
            this._responseControl.setVisibility(false);
        } else {
            this._welcomeControl.setVisibility(false);
            this._reqtItems.setVisibility(true);
            this._responseControl.setVisibility(true);
        }
    }

    private _updateResponseLocation(): void {
        let location = PreferenceStore.getResponseLocation();

        if (location == ResponseControlLocation.Workspace) {
            this._moveResponseControl(true);
        } else if (location == ResponseControlLocation.Console) {
            this._moveResponseControl(false);
        } else if (location == ResponseControlLocation.Automatic) {
            if (visualViewport.width > 1700)
                this._moveResponseControl(true);
            else
                this._moveResponseControl(false);
        } else {
            throw new Error(`ResponseControlLocation ${location} not supported`);
        }
    }

    private _updateMacrosControl(): void {
        let macrosFromCollection: Array<MacrosFromCollection>  = [];

        this._reqtItems.children().forEach(child => {
            if (!(child instanceof WItem)) return;
            const collection = child.getItem().getContainingCollection();
            const macros = child.getMacroNames();

            let filterResponse = macrosFromCollection.filter(mfc => mfc.collection == collection);
            if (filterResponse.length == 0) {
                macrosFromCollection.push({
                    collection, macros
                });
            } else if (filterResponse.length == 1) {
                macros.forEach(macro => {
                    if (filterResponse[0].macros.indexOf(macro) == -1)
                        filterResponse[0].macros.push(macro);
                });
            } else {
                throw new Error("More then one MacrosFromCollection per collection.");
            }
        });

        this._parameters.setMarcos(macrosFromCollection);
    }

    private _getPreviewWorkspaceItem(): WItem {
        if (this._reqtItems.getChildrenNumber() == 0)
            return null;

        let firstChild = this._reqtItems.children()[0];

        if (!(firstChild instanceof WItem))
            return null;

        if (firstChild.isPinned())
            return null;

        return firstChild;
    }

    private _getPinnedWorkspaceItem(item: HttpCollectionItem): WItem {
        let result = this._reqtItems.children().filter(child =>
            child instanceof WItem &&
            child.isPinned() &&
            child.getItem() == item);

        if (result.length == 0) return null;
        else if (result.length == 1) return <WItem>result[0];
        else {
            error("It seems there are several HttpReqtControls with same HttpReqt.");
            return null;
        }
    }

    private _onWorkspaceItemCloseRequested = (e: Event): void => {
        let sender = getAflonTarget(e);
        if (!(sender instanceof WItem)) return;

        this._removeWorkspaceItem(sender);
        this._updateMacrosControl();
        this._updateWelcomeControlVisibility();
    };

    private _onSendRequested = (e: Event): void => {
        this.sendRequest(e["detail"]["reqt"]);
    };

    private _onWorkspaceItemChanged = (): void => this._updateMacrosControl();

    private _removeWorkspaceItem(item: WItem): void {
        item.off(item.eventCloseRequested, this._onWorkspaceItemCloseRequested)
            .off(item.eventSendRequested, this._onSendRequested)
            .off(item.eventCollectionItemChanged, this._onWorkspaceItemChanged)
            .off(item.eventMouseEnter, this._onMouseEnter)
            .off(item.eventMouseLeave, this._onMouseLeave);
        this._reqtItems.removeChild(item);
    }

    private _createAndAddWorkspaceItem(item: HttpCollectionItem, pin: boolean = true, editableName: boolean = false): void {
        let control: WItem;

        if (item instanceof HttpReqt)
            control = new HttpReqtWitem();
        else if (item instanceof HttpAuth)
            control = new HttpAuthWitem();
        else
            throw new Error(`Collection item type ${item.constructor.name} not supported in Workspace.`);

        control
            .setItem(item)
            .on(control.eventCloseRequested, this._onWorkspaceItemCloseRequested)
            .on(control.eventSendRequested, this._onSendRequested)
            .on(control.eventCollectionItemChanged, this._onWorkspaceItemChanged)
            .on(control.eventMouseEnter, this._onMouseEnter)
            .on(control.eventMouseLeave, this._onMouseLeave);

        if (pin) {
            control
                .pin()
                .setExpanded(true);
        }

        if (editableName) {
            control.focusName();
        }

        this._reqtItems.prepend([ control ]);
        control.getHtmlElement().scrollIntoView();
    }

    private _onMouseEnter = (e: Event): void => {
        let sender = getAflonTarget(e);
        if (!(sender instanceof WItem)) return;
        this._parameters.setFocusedMacros(sender.getItem().getContainingCollection(),
            sender.getMacroNames());
    };

    private _onMouseLeave = (): void => {
        this._parameters.setFocusedMacros(null, null);
    };

    private _onBeforeUnload = (): void => {
        window.removeEventListener("beforeunload", this._onBeforeUnload);
        this._updateOpenWItemsCache();
    };

    private _updateOpenWItemsCache(): void {
        let items = this._reqtItems.children()
            .filter(child => child instanceof WItem)
            .map(child => <WItem>child)
            .map(witem => ({
                path: witem.getItem().getFullPath(),
                collectionUuid: witem.getItem().getContainingCollection().getUuid(),
                pinned: witem.isPinned()
            }));

        AppStatePersister.setOpenedWItems(items);
    }

    private _onResponseControlHistoryRequested(): void {
        if (!this._responseWithinWorkspace) return;
        this._showHistoryHost();
    }

    private _onExecutionSelected = (e: Event): void => {
        let details = e["detail"];

        let reqt = details["reqt"];
        let execution = details["execution"];

        if (reqt == null)
            this._responseControl.clear();
        else
            this._responseControl.setExecution(reqt, execution);
    };

    private _onResponseLocationChanged = (): void => {
        this._updateResponseLocation();
    };

    private _updateParametersAutoHide = (): void => {
        setTimeout(() => {
            if (PreferenceStore.getAutoHideParameters()) {
                this._collapseParameters();
                return;
            }

            this._expandParameters();
        }, 50);
    };

    private _onViewportResize = (): void => {
        this._updateResponseLocation();
    };
}

WorkspaceControl.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "stretch",
        minHeight: "0",
        minWidth: "0"
    },
    _innerWorkspace: {
        position: "relative",
        display: "flex",
        flexFlow: "row nowrap",
        overflowX: "hidden",
        overflowY: "hidden",
        flex: "1 1 100px",
        minHeight: "0"
    },
    _welcomeControl: {
        width: "100%",
        height: "100%"
    },
    _reqtItems: {
        display: "flex",
        flexFlow: "column nowrap",
        flex: "1 1 100%",
        overflowY: "auto",
        overflowX: "hidden",
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
    _historyHost: {
        display: "none",
        position: "absolute",
        left: "50%",
        marginLeft: "2px",
        marginTop: "2px",
        width: "300px",
        height: "70vh",
        background: Colors.consoleBackground,
        borderRadius: "5px",
        boxShadow: BoxShadowValues.consoleCollapsed,
        border: `solid 1px ${Colors.consoleBorder}`,
        overflow: "hidden",
        overflowY: "auto"
    },
    _parametersResizer: {
        zIndex: ZIndexLayers.base + 1
    },
    _parameters: {
        borderLeft: `1px solid ${Colors.workspaceLine}`,
        flex: "0 0 350px",
        maxWidth: "500px",
        minWidth: "350px",
        minHeight: "0"
    }
};

WorkspaceControl.animations = {
    show: {
        animations: [
            { track: "display", to: "block", target: "_historyHost"},
            { track: "opacity", to: 1, duration: 75, ease: "linear", target: "_historyHost"},
            { track: "boxShadow", target: "_historyHost", duration: 150, to: BoxShadowValues.consoleExtended }
        ],
        ease: "linear",
        duration: 75
    },
    hide: {
        animations: [
            { track: "opacity", duration: 40, delay: 40, to: 0, ease: "linear", target: "_historyHost"},
            { track: "boxShadow", target: "_historyHost", duration: 80, to: BoxShadowValues.consoleCollapsed },
            { track: "display", to: "none", target: "_historyHost", delay: 80}
        ],
        ease: "linear",
        duration: 75
    },
    collapseParameters: {
        animations: [
            { track: "marginRight", to: "-300px", ease: "circOut", duration: 150 }
        ]
    },
    expandParameters: {
        animations: [
            { track: "marginRight", to: "0px", ease: "circOut", duration: 150 }
        ]
    }
};
