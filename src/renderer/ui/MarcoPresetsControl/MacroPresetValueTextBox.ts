import { CSS } from "aflon";

import { MacroRecord } from "../../lib/http";

import { Colors } from "../StyleConstants";
import { TokenTextEditor } from "../TokenTextEditor";


export class MacroPresetValueTextBox extends TokenTextEditor {
    private _macroName: string;

    constructor() {
        super();

        this.setPlaceholder("No value");
    }

    setMacroRecord(record: MacroRecord): this {
        this._macroName = record.name;
        this.setText(record.value);
        return this;
    }

    getMacroRecord(): MacroRecord {
        return {
            name: this._macroName, value: this.getText()
        };
    }
}

MacroPresetValueTextBox.style = CSS.extendAflonCss(TokenTextEditor.style, {
    _: {
        width: "100%",
        height: "30px",
        lineHeight: "29px",
        overflowX: "scroll",
        paddingLeft: "8px",
        borderBottom: `1px solid ${Colors.workspaceLineWeak}`,
        borderLeft: `1px solid ${Colors.workspaceLineWeak}`,
        "&:focus": {
            ...TokenTextEditor.style["&:focus"],
            borderBottom: `1px solid ${Colors.workspaceLineWeak}`,
            borderLeft: `1px solid ${Colors.workspaceLineWeak}`,
            outline: "none"
        },
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _placeholderSpan: {
        color: Colors.tooltipBackgroundDefault
    }
});
