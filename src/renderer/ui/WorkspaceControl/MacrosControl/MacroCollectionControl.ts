import { Div } from "aflon";

import { HttpCollection, IMacroSource } from "../../../lib/http";
import { SimpleEvent } from "../../../lib/SimpleEvent";

import { Colors, FontStyles } from "../../StyleConstants";
import { ContextMenu, ContextMenuItemDefinition, ContextMenuItemType, ContextMenuShowTrigger } from "../../ContextMenu";
import { IconButton } from "../../IconButton";
import { MacroPresetsControl } from "../../MarcoPresetsControl";

import { MacroRecordControl } from "./MacroRecordControl";

export class MacroCollectionControl extends Div implements IMacroSource {

    private _header: Div;
    private _headerText: Div;
    private _presetsIcon: IconButton;
    private _content: Div;

    private _presetContextMenu: ContextMenu;

    private _collection: HttpCollection;

    constructor(collection: HttpCollection) {
        super();

        this._collection = collection;

        this.append([
            (this._header = new Div())
                .append([
                    (this._headerText = new Div())
                        .setText(`Collection ${this._collection.getName()}`),
                    (this._presetsIcon = new IconButton("preset"))
                ]),
            (this._content = new Div())
        ]);

        (this._presetContextMenu = new ContextMenu(this._presetsIcon, [], ContextMenuShowTrigger.OnClickEvent))
            .on(this._presetContextMenu.eventAboutToBeShown, () => this._onPresetContextMenuAboutToBeShown())
            .on(this._presetContextMenu.eventSelected, e => this._onPresetsSelected(e));
    }

    getCollection(): HttpCollection {
        return this._collection;
    }

    setMacroNames(macros: Array<string>, maxNameWidth: number = 0): this {
        this._content.empty();
        this._content.append(macros.map(macro => new MacroRecordControl(this._collection, macro, maxNameWidth)));
        return this;
    }

    getMacroNames(): Array<string> {
        let macros: Array<string> = [];

        this._content.children().forEach(child => {
            if (!(child instanceof MacroRecordControl)) return;
            let macroRecordControl = <MacroRecordControl>(child);
            macros.push(macroRecordControl.getMacroName());
        });

        return macros;
    }

    setMacrosInFocus(macrosInFocus: Array<string>): this {
        if (macrosInFocus == null) {
            this._content.children().forEach(child => {
                if (!(child instanceof MacroRecordControl)) return;
                child.setInlineCss({ opacity: 1.0 });
            });

            return this;
        }

        if (macrosInFocus.length == 0) {
            this._content.children().forEach(child => {
                child.setInlineCss({ opacity: 0.5 });
            });
        }

        this._content.children().forEach(child => {
            if (!(child instanceof MacroRecordControl)) return;

            if (macrosInFocus.includes(child.getMacroName()))
                child.setInlineCss({ opacity: 1.0 });
            else
                child.setInlineCss({ opacity: 0.5 });
        });

        return this;
    }

    private async _onPresetsSelected(e: SimpleEvent): Promise<void> {
        if (e.detail.id == "configure") {
            MacroPresetsControl.showAsModal(this._collection);
            return;
        }

        this._collection.applyMacroPreset(<string>e.detail.id);
    }

    private _onPresetContextMenuAboutToBeShown(): void {
        let def: Array<ContextMenuItemDefinition> = [
            { type: ContextMenuItemType.Title, text: "Parameter presets", id: "title" },
            {
                type: ContextMenuItemType.Text,
                text: "Presets simultaneously configure multiple parameters to predefined values.",
                id: "text" },
            { type: ContextMenuItemType.Divider, text: "Parameter presets", id: "div1" }
        ];

        let presets = this._collection.getMacroPresets().map(preset =>
            ({ type: ContextMenuItemType.Button, text: preset.name, id: preset.name }));

        if (presets.length != 0)
            def = [...def, ...presets];
        else
            def.push({ type: ContextMenuItemType.Text,
                text: "No defined presets. Click Configure to define new preset.",
                id: "text2" });

        def.push({ type: ContextMenuItemType.Divider, text: "Parameter presets", id: "div2" });
        def.push({ type: ContextMenuItemType.Button, text: "Configure presets", id: "configure", iconName: "settings" });

        this._presetContextMenu.setDefinition(def);
    }
}

MacroCollectionControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        paddingTop: "5px",
        paddingBottom: "5px",
        borderBottom: `solid 1px ${Colors.workspaceLine}`
    },
    _header: {
        display: "flex",
        flexFlow: "row nowrap",
        ...FontStyles.sansSerifNormal,
        color: Colors.workspaceDefault,
        fontSize: "10px",
        paddingLeft: "15px",
        paddingRight: "5px",
        alignItems: "center"
    },
    _headerText: {
        flex: "1 1 1px",
        paddingBottom: "2px"
    },
    _presetsIcon: {
        padding: "0",
        lineHeight: "normal",
        height: "auto",
        fontSize: "11px"
    },
    _content: {
        display: "flex",
        flexFlow: "column nowrap"
    }
};
