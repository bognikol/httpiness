import { Div } from "aflon";

import { ZoomManager } from "../../lib/WindowManipulation";
import { maximize } from "../../lib/WindowManipulation";
import { Platform, currentPlatform, openFileInDefaultApp } from "../../lib/Platform";
import { Version } from "../../lib/Version";
import { RapidsWebApi } from "../../lib/RapidsWebApi";
import { SimpleEvent } from "../../lib/SimpleEvent";
import { Telemetry, TelemetryEvent } from "../../lib/Telemetry";

import { Icon } from "../Icon";
import { Colors, ColorTheme, FontStyles, ImageUrls } from "../StyleConstants";
import { ContextMenu, ContextMenuItemType, ContextMenuShowTrigger, Tooltip } from "../ContextMenu";
import { PreferenceStore, ResponseControlLocation } from "../PreferenceStore";

import { Win32ControlBox } from "./Win32ControlBox";
import { InAppHelp } from "./InAppHelp";

export class ControlBar extends Div {
    private _controlBoxMacOsBuffer: Div;
    private _wordmark: Div;
    private _title: Div;
    private _version: Div;
    private _emptyBuffer: Div;
    private _updateButton: Div;
    private _helpButton: Div;
    private _help: InAppHelp;
    private _settingsButton: Div;
    private _controlBarOptions: Div;
    private _controlBoxWin32: Div;

    private _settingsContextMenu: ContextMenu;

    constructor() {
        super();

        if (currentPlatform() == Platform.MacOS) {
            this.append([
                (this._controlBoxMacOsBuffer = new Div())
                    .on(this.eventDblClick, () => maximize())
                    .addClass("control-bar")
            ]);
        }

        this.append([
            (this._wordmark = new Div())
                .on(this.eventDblClick, () => maximize())
                .addClass("control-bar"),
            (this._version = new Div())
                .setText(Version.current.toString()),
            (this._emptyBuffer = new Div())
                .on(this.eventDblClick, () => maximize())
                .addClass("control-bar"),
            (this._controlBarOptions = new Div())
                .append([
                    (this._updateButton = new Div())
                        .append([ new Icon("update") ])
                        .setVisibility(false)
                        .on(this._updateButton.eventClick, () => this._onUpdateButtonClick()),
                    (this._helpButton = new Div())
                        .append([ new Icon("docs")])
                        .on(this._helpButton.eventClick, () => this._onHelpButtonClick()),
                    (this._settingsButton = new Div())
                        .append([ new Icon("settings") ])
                ]),
            (this._help = new InAppHelp())
                .setVisibility(false)
        ]);

        if (currentPlatform() == Platform.Win32) {
            this.append([
                (this._controlBoxWin32 = new Win32ControlBox())
            ]);
            this._emptyBuffer.addCssClass({ marginRight: "100px" });
        }

        new Tooltip(this._updateButton).setText("Update available");
        new Tooltip(this._helpButton).setText("Help");
        new Tooltip(this._settingsButton).setText("Settings");

        (this._settingsContextMenu = new ContextMenu(this._settingsButton, [
            { type: ContextMenuItemType.CheckBox, id: "no-req-labels", text: "Hide request labels" },
            { type: ContextMenuItemType.CheckBox, id: "no-res-labels", text: "Hide response labels"},
            { type: ContextMenuItemType.CheckBox, id: "single-line-url", text: "Prefer single-line URL" },
            { type: ContextMenuItemType.CheckBox, id: "close-console-on-mouse-leave", text: "Close console on mouse leave" },
            { type: ContextMenuItemType.CheckBox, id: "auto-hide-params", text: "Auto-hide parameters" },
            { type: ContextMenuItemType.Divider, id: "dev1" },
            { type: ContextMenuItemType.Button, id: "res-loc", text: "Response location", submenu: [
                { type: ContextMenuItemType.CheckBox, id: "res-loc-console", text: "Console" },
                { type: ContextMenuItemType.CheckBox, id: "res-loc-workspace", text: "Workspace" },
                { type: ContextMenuItemType.CheckBox, id: "res-loc-auto", text: "Automatic, depending on space" }
            ]},
            { type: ContextMenuItemType.Divider, id: "dev2" },
            { type: ContextMenuItemType.Button, id: "zoom-in", text: "Zoom in" },
            { type: ContextMenuItemType.Button, id: "zoom-out", text: "Zoom out" },
            { type: ContextMenuItemType.Button, id: "zoom-reset", text: "Reset zoom" },
            { type: ContextMenuItemType.Divider, id: "dev3" },
            { type: ContextMenuItemType.Button, id: "color-theme", text: "Switch to dark theme" },
            { type: ContextMenuItemType.Divider, id: "dev4" },
            { type: ContextMenuItemType.Button, id: "report-issue", text: "Report an issue" },
            { type: ContextMenuItemType.Button, id: "give-feedback", text: "Give feedback", iconName: "say" }
        ], ContextMenuShowTrigger.OnClickEvent))
            .on(this._settingsContextMenu.eventSelected, e => this._onSettingsMenuSelected(e))
            .on(this._settingsContextMenu.eventAboutToBeShown, () => this._onSettingsMenuAboutToBeShown());

        setTimeout(async () => {
            let version = await RapidsWebApi.getLatestVersion();
            if (version.newerThen(Version.current))
                this._updateButton.setVisibility(true);
        }, 1);
    }

    showHelp(): this {
        this._help.setVisibility(!this._help.getVisibility());
        return this;
    }

    private _onUpdateButtonClick(): void {
        openFileInDefaultApp("https://www.httpiness.com#download");
    }

    private _onSettingsMenuSelected(e: SimpleEvent): void {
        let selectedId = e["detail"]["id"];
        if (!selectedId) return;

        if (selectedId == "zoom-in")
            ZoomManager.zoomIn();
        else if (selectedId == "zoom-out")
            ZoomManager.zoomOut();
        else if (selectedId == "zoom-reset")
            ZoomManager.zoomReset();
        else if (selectedId == "no-req-labels") {
            PreferenceStore.setHideRequestDescriptor(!PreferenceStore.getHideRequestDescriptor());
        } else if (selectedId == "no-res-labels") {
            PreferenceStore.setHideResponseDescriptor(!PreferenceStore.getHideResponseDescriptor());
        } else if (selectedId == "single-line-url") {
            PreferenceStore.setPreferSingleLineUrl(!PreferenceStore.getPreferSingleLineUrl());
        } else if (selectedId == "close-console-on-mouse-leave") {
            PreferenceStore.setCloseConsoleOnMouseLeave(!PreferenceStore.getCloseConsoleOnMouseLeave());
        } else if (selectedId == "res-loc-console") {
            PreferenceStore.setResponseLocation(ResponseControlLocation.Console);
        } else if (selectedId == "res-loc-workspace") {
            PreferenceStore.setResponseLocation(ResponseControlLocation.Workspace);
        } else if (selectedId == "res-loc-auto") {
            PreferenceStore.setResponseLocation(ResponseControlLocation.Automatic);
        } else if (selectedId == "auto-hide-params") {
            PreferenceStore.setAutoHideParameters(!PreferenceStore.getAutoHideParameters());
        } else if (selectedId == "color-theme") {
            let newTheme = ColorTheme.Light;
            if (PreferenceStore.getColorTheme() == ColorTheme.Light)
                newTheme = ColorTheme.Dark;

            PreferenceStore.setColorTheme(newTheme);
        } else if (selectedId == "report-issue") {
            openFileInDefaultApp("https://forms.gle/nC7XvMZLXXPHyRik9");
        } else if (selectedId == "give-feedback") {
            Telemetry.reportEvent(TelemetryEvent.FeedbackSent);
            openFileInDefaultApp("https://forms.gle/CMN15fRycYADAAbT6");
        }
    }

    private _onSettingsMenuAboutToBeShown(): void {
        this._settingsContextMenu.setChecked("no-req-labels", PreferenceStore.getHideRequestDescriptor());
        this._settingsContextMenu.setChecked("no-res-labels", PreferenceStore.getHideResponseDescriptor());
        this._settingsContextMenu.setChecked("single-line-url", PreferenceStore.getPreferSingleLineUrl());
        this._settingsContextMenu.setChecked("close-console-on-mouse-leave", PreferenceStore.getCloseConsoleOnMouseLeave());
        this._settingsContextMenu.setChecked("res-loc-console", PreferenceStore.getResponseLocation() == ResponseControlLocation.Console);
        this._settingsContextMenu.setChecked("res-loc-workspace", PreferenceStore.getResponseLocation() == ResponseControlLocation.Workspace);
        this._settingsContextMenu.setChecked("res-loc-auto", PreferenceStore.getResponseLocation() == ResponseControlLocation.Automatic);
        this._settingsContextMenu.setChecked("auto-hide-params", PreferenceStore.getAutoHideParameters());

        if (PreferenceStore.getColorTheme() == ColorTheme.Dark) {
            this._settingsContextMenu.setText("color-theme", "Switch to light theme");
        } else {
            this._settingsContextMenu.setText("color-theme", "Switch to dark theme");
        }
    }

    private _onHelpButtonClick(): void {
        this._help.setVisibility(!this._help.getVisibility());
    }
}

ControlBar.style = {
    _: {
        background: Colors.controlBarBackground,
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        borderBottom: `solid 1px ${Colors.workspaceLine}`
    },
    _controlBoxMacOsBuffer: {
        flex: "1 1 1px",
        height: "100%",
        paddingLeft: "80px"
    },
    _wordmark: {
        height: "100%",
        width: "100px",
        marginLeft: "10px",
        marginTop: "4px",
        backgroundImage: `url(${ImageUrls.wordmark})`,
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat"
    },
    _title: {
        ...FontStyles.sansSerifBold,
        fontSize: "16px",
        color: "#717171"
    },
    _version: {
        ...FontStyles.sansSerifBold,
        fontSize: "9px",
        marginLeft: "5px",
        marginTop: "6px",
        color: "#717171"
    },
    _emptyBuffer: {
        flex: "1 1 1px",
        height: "100%"
    },
    _controlBarOptions: {
        display: "flex",
        flexFlow: "row nowrap",
        color: Colors.browserDefault,
        fontSize: "13px",
        height: "100%",
        paddingRight: "10px"
    },
    _updateButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "30px",
        fontSize: "13px",
        textAlign: "center",
        color: Colors.statusWarn,
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _helpButton: {
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "29px",
        fontSize: "16px",
        textAlign: "center",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _settingsButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        fontSize: "15px",
        width: "29px",
        textAlign: "center",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _controlBoxWin32: {
        height: "100%"
    },
    _help: {
        position: "absolute",
        top: "30px",
        right: "30px"
    }
};
