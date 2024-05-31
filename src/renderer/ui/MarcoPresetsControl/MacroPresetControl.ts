import { Div, Container, TextBox } from "aflon";

import { MacroPreset, MacroRecord } from "../../lib/http";

import { SimpleModals } from "../Modals";
import { Colors, FontStyles } from "../StyleConstants";
import { IconButton } from "../IconButton";
import { ContextMenu, ContextMenuItemType, ContextMenuShowTrigger } from "../ContextMenu";

import { MacroPresetValueTextBox } from "./MacroPresetValueTextBox";
import { SimpleEvent } from "../../lib/SimpleEvent";

export class MacroPresetControl extends Div {
    public eventChange = "change";

    private _header: Div;
    private _nameTxtBx: TextBox;
    private _optionsBtn: IconButton;
    private _deleteBtn: IconButton;
    private _values: Container<MacroPresetValueTextBox>;

    private _contextMenu: ContextMenu;

    constructor() {
        super();

        this.append([
            (this._header = new Div())
                .append([
                    (this._nameTxtBx = new TextBox())
                        .setDisabled(true)
                        .on(this._nameTxtBx.eventBlur, () => this._onNameTxtBxBlur())
                        .on(this._nameTxtBx.eventKeyDown, e => this._nameTxtBxKeyDown(e)),
                    (this._optionsBtn = new IconButton("options"))
                ]),
            (this._values = new Container<MacroPresetValueTextBox>())
        ]);

        (this._contextMenu = new ContextMenu(this._optionsBtn, [
            { id: "rename", text: "Rename", type: ContextMenuItemType.Button },
            { id: "delete", text: "Delete", type: ContextMenuItemType.Button, iconName: "delete" }
        ], ContextMenuShowTrigger.OnClickEvent))
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e));
    }

    updateNames(names: Array<string>): this {
        let presetControls: Record<string, MacroPresetValueTextBox> = {};

        this._values.children().forEach(child => presetControls[child.getMacroRecord().name] = child);

        this._values.empty();

        this._values.append(names.map(name => {
            if (presetControls[name])
                return presetControls[name];
            else
                return this._createNewMacroPresetValueTextEditor({ name, value: "" });
        }));

        return this;
    }

    setMacroPreset(preset: MacroPreset): this {
        this._nameTxtBx.setText(preset.name);
        this._values.empty();
        this._values.append(preset.macros.map(macro => this._createNewMacroPresetValueTextEditor(macro)));
        return this;
    }

    getMacroPreset(): MacroPreset {
        return {
            name: this._nameTxtBx.getText(),
            macros: this._values.children().map(value => value.getMacroRecord())
        };
    }

    enterRenameMode(): this {
        this._nameTxtBx.setDisabled(false);
        setTimeout(() => {
            (<HTMLInputElement> this._nameTxtBx.getHtmlElement()).setSelectionRange(0,
                this._nameTxtBx.getText().length);
            this._nameTxtBx.focus();
        }, 0);

        return this;
    }

    private _nameTxtBxKeyDown(e: Event): void {
        let keyEvent = <KeyboardEvent>e;

        if (keyEvent.key != "Enter") return;

        this._nameTxtBx.blur();
    }

    private async _onContextMenuSelected(e: SimpleEvent): Promise<void> {
        let selectedId = e.detail["id"];

        if (!selectedId) return;

        if (selectedId == "delete") {
            let result = await SimpleModals.confirm(`Are you sure you want to delete preset ${this._nameTxtBx.getText()}?`);

            if (result)
                this.parent().removeChild(this);
        } else if (selectedId == "rename") {
            this.enterRenameMode();
        }
    }

    private _createNewMacroPresetValueTextEditor(macro: MacroRecord): MacroPresetValueTextBox {
        let editor = new MacroPresetValueTextBox();

        editor
            .setMacroRecord(macro)
            .on(editor.eventChange, () => this._onEditorChange());

        return editor;
    }

    private _onEditorChange(): void {
        this.raise(this.eventChange);
    }

    private _onNameTxtBxBlur(): void {
        setTimeout(() => this._nameTxtBx.setDisabled(true), 0);
    }
}

MacroPresetControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        flex: "1 0 200px"
    },
    _header: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        height: "30px",
        paddingLeft: "5px",
        paddingRight: "3px",
        borderBottom: `1px solid ${Colors.workspaceLineWeak}`,
        borderLeft: `1px solid ${Colors.workspaceLineWeak}`
    },
    _nameTxtBx: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDescriptor,
        outline: "none",
        border: "none",
        paddingLeft: "5px",
        marginRight: "3px",
        height: "20px",
        flex: "1 1 1px",
        padding: "0",
        borderRadius: "3px",
        fontSize: "11px",
        background: "none",
        "&:focus": {
            outline: "none"
        },
        "&:disabled": {
            userSelect: "none",
            pointerEvents: "none"
        }
    },
    _optionsBtn: {
        fontSize: "15px",
        color: Colors.workspacePlaceholder
    },
    _values: {
        display: "flex",
        flexFlow: "column nowrap",
        width: "100%"
    }
};
