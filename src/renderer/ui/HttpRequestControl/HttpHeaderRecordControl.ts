import { Div, Span } from "aflon";

import { HttpHeaderRecord, IMacroSource } from "../../lib/http";

import { Colors, FontStyles } from "../StyleConstants";
import { MacroedTextEditor } from "../TokenTextEditor";
import { CaretPosition, FocusLeaveDirection, IKeyboardNavigable } from "../IKeyboardNavigable";

export class HttpHeaderRecordControl extends Div implements IMacroSource, IKeyboardNavigable {

    public eventHeaderRecordChanged = "headerRecordChanged";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _headerNameTextBox: MacroedTextEditor;
    private _delimiter: Span;
    private _headerValueTextBox: MacroedTextEditor;

    constructor() {
        super();

        this.append([
            (this._headerNameTextBox = new MacroedTextEditor())
                .on(this._headerNameTextBox.eventFocusLeaveRequested, e => this._onNameFocusLeaveRequested(e))
                .on(this._headerNameTextBox.eventKeyDown, e => this._onHeaderNameKeyDown(e))
                .on(this._headerNameTextBox.eventChange, () => this._onChange()),
            (this._delimiter = new Span())
                .setText(":"),
            (this._headerValueTextBox = new MacroedTextEditor())
                .setNewLineInsertionAllowed(true)
                .on(this._headerValueTextBox.eventFocusLeaveRequested, e => this._onValueFocusLeaveRequested(e))
                .on(this._headerValueTextBox.eventChange, () => this._onChange())
        ]);
    }

    getMacroNames(): Array<string> {
        let macros = [ ...this._headerNameTextBox.getMacroNames() ];

        this._headerValueTextBox.getMacroNames().forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        return macros;
    }

    setHeaderRecord(header: HttpHeaderRecord): this {
        this._headerNameTextBox.setText(header.name);
        this._headerValueTextBox.setText(header.value);
        return this;
    }

    getHeaderRecord(): HttpHeaderRecord {
        return {
            name: this._headerNameTextBox.getText(),
            value: this._headerValueTextBox.getText()
        };
    }

    setReadOnly(readonly: boolean): this {
        this._headerNameTextBox.setReadOnly(readonly);
        this._headerValueTextBox.setReadOnly(readonly);
        return this;
    }

    getReadOnly(): boolean {
        return this._headerNameTextBox.getReadOnly() || this._headerValueTextBox.getReadOnly();
    }

    setCaretPosition(position: CaretPosition): this {
        if (position.column == -1) {
            this._headerValueTextBox.setCaretPosition(position);
            return this;
        }

        let nameLength = this._headerNameTextBox.getText().length;

        if (position.column > nameLength) {
            position.column -= nameLength;
            this._headerNameTextBox.setCaretPosition(position);
            return this;
        }

        this._headerNameTextBox.setCaretPosition(position);
        return this;
    }

    getCaretPosition(): CaretPosition {
        let valuePosition = this._headerValueTextBox.getCaretPosition();

        if (valuePosition != null) {
            valuePosition.column += this._headerNameTextBox.getText().length;
            return valuePosition;
        }

        return this._headerNameTextBox.getCaretPosition();
    }

    private _onChange(): void {
        this.raise(this.eventHeaderRecordChanged);
    }

    private _onNameFocusLeaveRequested(e: Event): void {
        let direction = <FocusLeaveDirection>e["detail"]["direction"];
        if (direction == FocusLeaveDirection.Right) {
            this._headerValueTextBox.setCaretPosition({ row: 0, column: 0 });
        } else {
            this.raise(this.eventFocusLeaveRequested, { direction });
        }
    }

    private _onValueFocusLeaveRequested(e: Event): void {
        let direction = <FocusLeaveDirection>e["detail"]["direction"];

        if (direction == FocusLeaveDirection.Left || direction == FocusLeaveDirection.Backspace) {
            this._headerNameTextBox.setCaretPosition({ row: -1, column: -1 });
        } else {
            this.raise(this.eventFocusLeaveRequested, { direction });
        }
    }

    private _onHeaderNameKeyDown(e: Event): void {
        let key = (<KeyboardEvent> e).key;

        let name = this._headerNameTextBox.getText();

        if (key == ":" && name[name.length - 1] == ":") {
            this._headerNameTextBox.setText(name.substring(0, name.length - 1));
            this._headerValueTextBox.focus();
        } else if (name.includes(":")) {
            let [ newName, value ] = name.split(":");

            if (!newName) newName = "";
            if (!value) value = "";

            this._headerNameTextBox.setText(newName);
            this._headerValueTextBox.setText(value);
            this._headerValueTextBox.setCaretPosition({ row: -1, column: -1 });

            this.raise(this.eventHeaderRecordChanged);
        }
    }
}

HttpHeaderRecordControl.style = {
    _ : {
        display: "flex",
        flexFlow: "row nowrap"
    },
    _delimiter: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceAccent,
        margin: "0 5px",
        height: "20px"
    },
    _headerNameTextBox: {
        height: "20px",
        overflow: "scroll",
        flex: "0 0 auto",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _headerValueTextBox: {
        lineHeight: "20px",
        whiteSpace: "nowrap",
        overflow: "scroll",
        flex: "1 1 1px",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    }
};
