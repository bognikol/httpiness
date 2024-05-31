import { Div } from "aflon";
import { IMacroSource } from "../../../lib/http";

import { showOpenDialog } from "../../../lib/SystemDialogs";

import { Button } from "../../BasicControls";
import { CaretPosition, IKeyboardNavigable } from "../../IKeyboardNavigable";
import { MacroedTextEditor } from "../../TokenTextEditor/MacroedTextEditor";


export class HttpFileBodyControl extends Div implements IKeyboardNavigable, IMacroSource {
    public eventBodyChanged = "bodyChanged";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _browseButton: Button;
    private _pathTextBox: MacroedTextEditor;

    constructor() {
        super();

        this.append([
            (this._browseButton = new Button())
                .setText("Browse")
                .on(this._browseButton.eventClick, () => this._onClick()),
            (this._pathTextBox = new MacroedTextEditor())
                .setPlaceholder("Type path to file")
                .setNewLineInsertionAllowed(false)
                .on(this._pathTextBox.eventChange, () => this.raise(this.eventBodyChanged))
                .on(this._pathTextBox.eventFocusLeaveRequested, e => this.raise(this.eventFocusLeaveRequested, e["detail"]))
        ]);
    }

    setPath(path: string): this {
        this._pathTextBox.setText(path);
        return this;
    }

    getPath(): string {
        return this._pathTextBox.getText().trim();
    }

    setCaretPosition(position: CaretPosition): this {
        this._pathTextBox.setCaretPosition(position);
        return this;
    }

    getCaretPosition(): CaretPosition {
        return this._pathTextBox.getCaretPosition();
    }

    getMacroNames(): Array<string> {
        return this._pathTextBox.getMacroNames();
    }

    private async _onClick(): Promise<void> {
        const result = await showOpenDialog({
            title: "Select file",
            properties: [ "openFile" ]
        });

        if (result.canceled) return;

        this._pathTextBox.setText(result.filePaths[0]);
        this.raise(this.eventBodyChanged);
    }
}

HttpFileBodyControl.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center"
    },
    _browseButton: {
        flex: "0 0 content"
    },
    _pathTextBox: {
        marginLeft: "10px",
        overflowX: "scroll",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    }
};
