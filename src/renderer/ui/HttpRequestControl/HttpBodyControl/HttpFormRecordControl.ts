import { Div, Span } from "aflon";

import { HttpBodyContentType, HttpFormRecord, IMacroSource, IReadOnlyMacroContext } from "../../../lib/http";
import { showOpenDialog } from "../../../lib/SystemDialogs";

import { Colors, FontStyles } from "../../StyleConstants";
import { MacroedTextEditor } from "../../TokenTextEditor";
import { CaretPosition, FocusLeaveDirection, IKeyboardNavigable } from "../../IKeyboardNavigable";
import { Tooltip } from "../../ContextMenu";

class HttpFormRecordTypeControl extends Div {
    eventChange: string = "changed";

    private _text: Span;
    private _tooltip: Tooltip;

    private _disabled: boolean = false;

    constructor() {
        super();

        this.append([
            (this._text = new Span())
                .setText("T")
        ]).on(this.eventClick, () => this._onClick());

        (this._tooltip = new Tooltip(this))
            .setText("Toggle form record type between Text and File.");
    }

    setHttpFormRecordType(type: HttpBodyContentType): this {
        if (type == HttpBodyContentType.File)
            this._text.setText("F");
        else if (type == HttpBodyContentType.Text)
            this._text.setText("T");
        else
            throw new Error(`HttpBodyContentType ${type} is not supported`);
        return this;
    }

    getHttpFormRecordType(): HttpBodyContentType {
        if (this._text.getText() == "F") return HttpBodyContentType.File;
        return HttpBodyContentType.Text;
    }

    setDisabled(disabled: boolean): this {
        this._disabled = disabled;
        return this;
    }

    getDisabled(): boolean {
        return this._disabled;
    }

    private _onClick(): void {
        if (this._disabled) return;

        let selectedValue = this.getHttpFormRecordType();

        if (selectedValue == HttpBodyContentType.Text)
            this.setHttpFormRecordType(HttpBodyContentType.File);
        else
            this.setHttpFormRecordType(HttpBodyContentType.Text);

        this.raise(this.eventChange);
    }
}

HttpFormRecordTypeControl.style = {
    _: {
        background: Colors.workspaceLine,
        color: Colors.workspaceDefault,
        fontSize: "11px",
        fontWeight: "bold",
        cursor: "pointer",
        width: "16px",
        height: "16px",
        borderRadius: "4px",
        lineHeight: "16px",
        textAlign: "center",
        textDecoration: "none",
        "&:hover": {
            color: Colors.workspaceDescriptor
        }
    }
};

export class HttpFormRecordControl extends Div implements IMacroSource, IKeyboardNavigable {

    public eventFormRecordChanged = "formRecordChanged";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _formRecordType: HttpFormRecordTypeControl;
    private _formNameTextBox: MacroedTextEditor;
    private _delimiter: Span;
    private _formValueTextBox: MacroedTextEditor;
    private _browseBtn: Div;

    private _macroContext: IReadOnlyMacroContext = null;

    constructor() {
        super();

        this.append([
            (this._formRecordType = new HttpFormRecordTypeControl())
                .addAttr("tabindex", "-1")
                .on(this._formRecordType.eventChange, () => this._onChange()),
            (this._formNameTextBox = new MacroedTextEditor())
                .setPlaceholder("...")
                .on(this._formNameTextBox.eventChange, () => this._onChange())
                .on(this._formNameTextBox.eventFocusLeaveRequested, e => this._onNameFocusLeaveRequested(e))
                .on(this._formNameTextBox.eventKeyDown, e => this._onFormNameKeyDown(e)),
            (this._delimiter = new Span())
                .setText("="),
            (this._formValueTextBox = new MacroedTextEditor())
                .setPlaceholder("...")
                .setNewLineInsertionAllowed(true)
                .on(this._formValueTextBox.eventChange, () => this._onChange())
                .on(this._formValueTextBox.eventInput, () => this._onFormValueInput())
                .on(this._formValueTextBox.eventFocusLeaveRequested, e => this._onValueFocusLeaveRequested(e)),
            (this._browseBtn = new Div())
                .setVisibility(false)
                .setText("Browse")
                .addAttr("tabindex", "-1")
                .on(this._browseBtn.eventClick, () => this._onBrowseClick())
        ]);

        this.on(this.eventMouseEnter, () => this._onMouseEnter())
            .on(this.eventMouseLeave, () => this._onMouseLeave());
    }

    getMacroNames(): Array<string> {
        let macros = [ ...this._formNameTextBox.getMacroNames() ];

        this._formValueTextBox.getMacroNames().forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        return macros;
    }

    setFormRecord(record: HttpFormRecord): this {
        this._formNameTextBox.setText(record.name);
        this._formValueTextBox.setText(record.value);
        this._formRecordType.setHttpFormRecordType(record.type);

        this._updateOpacity();
        return this;
    }

    getFormRecord(): HttpFormRecord {
        return {
            name: this._formNameTextBox.getText(),
            value: this._formValueTextBox.getText(),
            type: this._formRecordType.getHttpFormRecordType()
        };
    }

    setReadOnly(readonly: boolean): this {
        this._formNameTextBox.setReadOnly(readonly);
        this._formValueTextBox.setReadOnly(readonly);
        this._formRecordType.setDisabled(readonly);
        return this;
    }

    getReadOnly(): boolean {
        return this._formNameTextBox.getReadOnly() || this._formValueTextBox.getReadOnly();
    }

    setCaretPositionAtEnd(): void {
        this._formValueTextBox.setCaretPosition({ row: -1, column: -1 });
    }

    setCaretPositionAtStart(): void {
        this._formNameTextBox.setCaretPosition({ row: 0, column: 0 });
    }

    setCaretPosition(position: CaretPosition): this {
        if (position.column == -1) {
            this._formValueTextBox.setCaretPosition(position);
            return this;
        }

        let nameLength = this._formNameTextBox.getText().length;

        if (position.column > nameLength) {
            position.column -= nameLength;
            this._formNameTextBox.setCaretPosition(position);
            return this;
        }

        this._formNameTextBox.setCaretPosition(position);
        return this;
    }

    getCaretPosition(): CaretPosition {
        let valuePosition = this._formValueTextBox.getCaretPosition();

        if (valuePosition != null) {
            valuePosition.column += this._formNameTextBox.getText().length;
            return valuePosition;
        }

        return this._formNameTextBox.getCaretPosition();
    }

    setMacroContext(macroContext: IReadOnlyMacroContext): this {
        if (this._macroContext != null)
            this._macroContext.off(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
        this._macroContext = macroContext;
        this._macroContext.on(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
        this._updateOpacity();
        return this;
    }

    getMacroContext(): IReadOnlyMacroContext {
        return this._macroContext;
    }

    protected _onLeavingDom(): void {
        if (this._macroContext == null) return;
        this._macroContext.off(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
    }

    private _onChange(): void {
        this._updateOpacity();

        if (this._formRecordType.getHttpFormRecordType() == HttpBodyContentType.Text)
            this._browseBtn.setVisibility(false);
        else
            this._browseBtn.setVisibility(true);

        this.raise(this.eventFormRecordChanged);
    }

    private _onFormValueInput(): void {
        this._updateOpacity();
    }

    private _onNameFocusLeaveRequested(e: Event): void {
        let direction = <FocusLeaveDirection>e["detail"]["direction"];
        if (direction == FocusLeaveDirection.Right) {
            this._formValueTextBox.setCaretPosition({ row: 0, column: 0 });
        } else {
            this.raise(this.eventFocusLeaveRequested, { direction });
        }
    }

    private _onValueFocusLeaveRequested(e: Event): void {
        let direction = <FocusLeaveDirection>e["detail"]["direction"];
        if (direction == FocusLeaveDirection.Left || direction == FocusLeaveDirection.Backspace) {
            this._formNameTextBox.setCaretPosition({ row: -1, column: -1 });
        } else {
            this.raise(this.eventFocusLeaveRequested, { direction });
        }
    }

    private async _onBrowseClick(): Promise<void> {
        const result = await showOpenDialog({
            title: "Select file",
            properties: [ "openFile" ]
        });

        if (result.canceled) return;

        this._formValueTextBox.setText(result.filePaths[0]);
        this.raise(this.eventFormRecordChanged);
    }

    private _onMouseEnter(): void {
        if (this._formRecordType.getHttpFormRecordType() != HttpBodyContentType.File) return;
        this._browseBtn.setVisibility(true);
    }

    private _onMouseLeave(): void {
        this._browseBtn.setVisibility(false);
    }

    private _onFormNameKeyDown(e: Event): void {
        let key = (<KeyboardEvent> e).key;

        let name = this._formNameTextBox.getText();

        if (key == "=" && name[name.length - 1] == "=") {
            this._formNameTextBox.setText(name.substring(0, name.length - 1));
            this._formValueTextBox.focus();
        } else if (name.includes("=")) {
            let [ newName, value ] = name.split("=");

            if (!newName) newName = "";
            if (!value) value = "";

            this._formNameTextBox.setText(newName);
            this._formValueTextBox.setText(value);
            this._formValueTextBox.setCaretPosition({ row: -1, column: -1 });

            this.raise(this.eventFormRecordChanged);
        }
    }

    private async _updateOpacity(): Promise<void> {
        let effectiveName = this._formNameTextBox.getText();
        let effectiveValue = this._formValueTextBox.getText();

        if (this._macroContext) {
            for (let name of this._formValueTextBox.getMacroNames()) {
                effectiveName = effectiveName.replace("${" + name + "}", await this._macroContext.getMacroValue(name));
                effectiveValue = effectiveValue.replace("${" + name + "}", await this._macroContext.getMacroValue(name));
            }
        }

        if (!effectiveValue && effectiveName) {
            this._formNameTextBox.setInlineCss({ opacity: 0.5 });
            this._delimiter.setInlineCss({ opacity: 0.5 });
            this._formValueTextBox.setInlineCss({ opacity: 0.5 });
        } else {
            this._formNameTextBox.setInlineCss({ opacity: 1.0 });
            this._delimiter.setInlineCss({ opacity: 1.0 });
            this._formValueTextBox.setInlineCss({ opacity: 1.0 });
        }
    }

    private _onMacroChanged = (): void => {
        this._updateOpacity();
    };
}

HttpFormRecordControl.style = {
    _ : {
        display: "flex",
        flexFlow: "row nowrap"
    },
    _formRecordType: {
        marginRight: "7px",
        position: "relative",
        alignSelf: "flex-start",
        marginTop: "1px",
        flex: "0 0 auto"
    },
    _delimiter: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceAccent,
        margin: "0 5px",
        height: "20px"
    },
    _formNameTextBox: {
        height: "20px",
        overflowX: "scroll",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _formValueTextBox: {
        lineHeight: "20px",
        overflowX: "scroll",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _browseBtn: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDefault,
        fontSize: "12px",
        lineHeight: "20px",
        height: "20px",
        cursor: "pointer",
        textDecoration: "underline",
        display: "inline-block",
        marginLeft: "10px",
        position: "relative"
    }
};
