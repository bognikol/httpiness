import { Div } from "aflon";

import { SimpleEvent } from "../../lib/SimpleEvent";

import { ContextMenu, ContextMenuItemType, ContextMenuShowTrigger } from "../ContextMenu";
import { Icon } from "../Icon";
import { PreferenceStore, ResponseControlLocation } from "../PreferenceStore";
import { Colors } from "../StyleConstants";

export class ResponsePanelOptionsButton extends Div {

    private _optionsContextMenu: ContextMenu;

    constructor() {
        super();

        this.append([
            new Icon("options")
        ]);

        (this._optionsContextMenu =
            new ContextMenu(this, [
                { type: ContextMenuItemType.Title, id: "res-loc-title", text: "Response panel location" },
                { type: ContextMenuItemType.CheckBox, id: "res-loc-console", text: "Console" },
                { type: ContextMenuItemType.CheckBox, id: "res-loc-workspace", text: "Workspace" },
                { type: ContextMenuItemType.CheckBox, id: "res-loc-auto", text: "Automatic, depending on space" }
            ], ContextMenuShowTrigger.OnClickEvent))
            .on(this._optionsContextMenu.eventAboutToBeShown, () => this._onOptionsContextMenuAboutToBeShown())
            .on(this._optionsContextMenu.eventSelected, e => this._onOptionsContextMenuSelected(e));
    }

    private _onOptionsContextMenuAboutToBeShown(): void {
        this._optionsContextMenu.setChecked("res-loc-console",
            PreferenceStore.getResponseLocation() == ResponseControlLocation.Console);
        this._optionsContextMenu.setChecked("res-loc-workspace",
            PreferenceStore.getResponseLocation() == ResponseControlLocation.Workspace);
        this._optionsContextMenu.setChecked("res-loc-auto",
            PreferenceStore.getResponseLocation() == ResponseControlLocation.Automatic);
    }

    private _onOptionsContextMenuSelected(e: SimpleEvent): void {
        let selectedId = e["detail"]["id"];
        if (!selectedId) return;

        if (selectedId == "res-loc-console") {
            PreferenceStore.setResponseLocation(ResponseControlLocation.Console);
        } else if (selectedId == "res-loc-workspace") {
            PreferenceStore.setResponseLocation(ResponseControlLocation.Workspace);
        } else if (selectedId == "res-loc-auto") {
            PreferenceStore.setResponseLocation(ResponseControlLocation.Automatic);
        }
    }
}

ResponsePanelOptionsButton.style = {
    _ : {
        display: "flex",
        fontSize: "15px",
        alignContent: "center",
        alignItems: "center",
        paddingLeft: "2px",
        paddingTop: "2px",
        textAlign: "center",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        "&:hover": {
            color: Colors.consoleDominant
        }
    }
};
