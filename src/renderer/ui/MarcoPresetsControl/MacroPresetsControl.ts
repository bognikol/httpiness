import { Div, Container } from "aflon";

import { IMacroContext, MacroPreset } from "../../lib/http";

import { Modal, ModalContent } from "../Modals";
import { Colors, ZIndexLayers } from "../StyleConstants";
import { Button } from "../BasicControls";

import { MacroNamesControl } from "./MacroNamesControl";
import { MacroPresetControl } from "./MacroPresetControl";

export class MacroPresetsControl extends Div implements ModalContent<Array<MacroPreset>> {
    public eventResultReady = "resultReady";

    private _content: Div;
    private _macroNames: MacroNamesControl;
    private _macroPresetControls: Container<MacroPresetControl>;
    private _footer: Div;
    private _newPresetButton: Button;
    private _footerBuffer: Div;
    private _submitButton: Button;
    private _cancelButton: Button;

    constructor(macroContext: IMacroContext) {
        super();

        this.append([
            (this._content = new Div())
                .append([
                    (this._macroNames = new MacroNamesControl())
                        .on(this._macroNames.eventChange, () => this._onMacroNamesChanged()),
                    (this._macroPresetControls = new Container<MacroPresetControl>())
                ]),
            (this._footer = new Div())
                .append([
                    (this._newPresetButton = new Button())
                        .setText("New preset")
                        .on(this._newPresetButton.eventClick, () => this._onNewPresetButtonClick()),
                    (this._footerBuffer = new Div()),
                    (this._submitButton = new Button())
                        .setText("OK")
                        .on(this._submitButton.eventClick, () => this.raise(this.eventResultReady)),
                    (this._cancelButton = new Button())
                        .setText("Cancel")
                        .on(this._cancelButton.eventClick, () => this.raise(this.eventResultReady))
                ])
        ]);

        this.setMacroPresets(macroContext.getMacroPresets());
    }

    static async showAsModal(macroContext: IMacroContext): Promise<void> {
        let presets = await new Modal().show(new MacroPresetsControl(macroContext));
        macroContext.setMacroPresets(presets);
    }

    public getResult(): Array<MacroPreset> {
        let presets = this.getMacroPresets();
        return presets;
    }

    setMacroPresets(presets: Array<MacroPreset>): this {
        let names: Array<string> = [];

        presets.forEach(preset => {
            preset.macros.map(macro => macro.name).forEach(name => {
                if (!names.includes(name))
                    names.push(name);
            });
        });

        this._macroNames.setNames(names);

        this._macroPresetControls.append(presets.map(preset =>
            new MacroPresetControl()
                .setMacroPreset(preset)
                .updateNames(names)
        ));

        return this;
    }

    getMacroPresets(): Array<MacroPreset> {
        return this._macroPresetControls.children().map(child => child.getMacroPreset());
    }

    private _onMacroNamesChanged(): void {
        this._macroPresetControls.children().forEach(child =>
            child.updateNames(this._macroNames.getNames())
        );
    }

    private _onNewPresetButtonClick(): void {
        this._macroPresetControls.append([
            new MacroPresetControl()
                .setMacroPreset({ name: this._generateNewPresetName(), macros: [] })
                .updateNames(this._macroNames.getNames())
                .enterRenameMode()
        ]);
    }

    private _generateNewPresetName(): string {
        let names = this._macroPresetControls.children().map(ctrl => ctrl.getMacroPreset().name);

        let baseName = "Untitled preset";

        if (!names.includes(baseName))
            return baseName;

        let counter = 1;

        while (names.includes(`${baseName} (${counter})`)) {
            counter++;
        }

        return `${baseName} (${counter})`;
    }
}

MacroPresetsControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        width: "70vw",
        height: "70vh"
    },
    _content: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "flex-start",
        flex: "1 1 1px",
        minHeight: "250px",
        overflowY: "auto",
        overflowX: "hidden",
        borderBottom: `3px solid ${Colors.workspaceLineWeak}`,
        borderTop: `3px solid ${Colors.workspaceLineWeak}`,
        "&::-webkit-scrollbar": {
            borderRight: `solid 1px ${Colors.workspaceLineWeak}`
        }
    },
    _macroNames: {
        flex: "0 0 200px",
        minHeight: "100%",
        borderRight: `3px solid ${Colors.workspaceLineWeak}`,
        zIndex: ZIndexLayers.modal + 1
    },
    _macroPresetControls: {
        display: "flex",
        flexFlow: "row nowrap",
        flex: "1 1 1px",
        overflowX: "auto",
        overflowY: "hidden",
        marginLeft: "-1px",
        borderRight: `1px solid ${Colors.workspaceLineWeak}`,
        "&::-webkit-scrollbar": {
            borderBottom: `solid 1px ${Colors.workspaceLineWeak}`
        }
    },
    _footer: {
        display: "flex",
        flexFlow: "row nowrap",
        justifyContent: "flex-end",
        marginTop: "20px"
    },
    _newPresetButton: {
    },
    _footerBuffer: {
        flex: "1 1 1px"
    },
    _submitButton: {

    },
    _cancelButton: {
        marginLeft: "10px"
    }
};
