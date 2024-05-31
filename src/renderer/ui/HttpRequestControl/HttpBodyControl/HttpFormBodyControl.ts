import { Div, typeAflonTarget } from "aflon";

import { HttpFormBody, IMacroSource, IReadOnlyMacroContext } from "../../../lib/http";
import { CaretPosition, FocusLeaveDirection, IKeyboardNavigable } from "../../IKeyboardNavigable";

import { HttpFormRecordControl } from "./HttpFormRecordControl";

export class HttpFormBodyControl extends Div implements IMacroSource, IKeyboardNavigable {
    public eventFormBodyChanged = "formBodyChanged";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _readOnly: boolean = false;

    constructor() {
        super();

        this._addEmptyFormRecordControl();
    }

    getMacroNames(): Array<string> {
        let macros: Array<string> = [];

        this.children().forEach(child => {
            const headerRecord = (<HttpFormRecordControl>child);
            headerRecord.getMacroNames().forEach(macro => {
                if (macros.indexOf(macro) == -1)
                    macros.push(macro);
            });
        });

        return macros;
    }

    setBody(form: HttpFormBody): this {
        this.empty();

        if (form != null) {
            form.records.forEach(record => {
                let formRcrdCtrl = new HttpFormRecordControl();
                formRcrdCtrl
                    .setFormRecord(record)
                    .setReadOnly(this._readOnly)
                    .on(formRcrdCtrl.eventFormRecordChanged, () => this._onFormRecordChanged())
                    .on(formRcrdCtrl.eventFocusOut, e => this._onFocusOut(e))
                    .on(formRcrdCtrl.eventFocusLeaveRequested, e => this._onFocusLeaveRequested(e));
                this.append([formRcrdCtrl]);
            });
        }

        if (!this._readOnly)
            this._addEmptyFormRecordControl();
        return this;
    }

    getBody(): HttpFormBody {
        let formBody = new HttpFormBody();

        this.children().forEach(child => {
            const formRecord = (<HttpFormRecordControl>child).getFormRecord();
            if (formRecord.name.length != 0 ||
                formRecord.value.length != 0)
                formBody.records.push(formRecord);
        });

        return formBody;
    }

    setReadOnly(readOnly: boolean): this {
        if (this._readOnly == readOnly) return this;

        this._readOnly = readOnly;

        this.children().forEach(child => {
            if (child instanceof HttpFormRecordControl)
                (<HttpFormRecordControl>child).setReadOnly(readOnly);
        });

        if (this._readOnly)
            this._removeEmptyFormRecordControl();
        else
            this._removeEmptyFormRecordControl();

        return this;
    }

    getReadOnly(): boolean {
        return this._readOnly;
    }

    setCaretPosition(position: CaretPosition): this {
        let children = this.children();
        if (children.length == 0) return this;

        if (position.row == -1 || position.row > children.length - 1)
            position.row = children.length - 1;

        let child = children[position.row];
        if (!(child instanceof HttpFormRecordControl)) return this;

        child.setCaretPosition({ row: 0, column: position.column });
        return this;
    }

    getCaretPosition(): CaretPosition {
        let headers = this.children();

        for (let i = 0; i <= headers.length - 1; i++) {
            let header = headers[i];
            if (!(header instanceof HttpFormRecordControl)) continue;
            let caretPosition = header.getCaretPosition();
            if (caretPosition == null) continue;

            return { row: i, column: caretPosition.column };
        }

        return null;
    }

    setMacroContext(macroContext: IReadOnlyMacroContext): this {
        this.children().forEach(child => {
            if (!(child instanceof HttpFormRecordControl)) return;
            child.setMacroContext(macroContext);
        });

        return this;
    }

    getMacroContext(): IReadOnlyMacroContext {
        for (let child of this.children()) {
            if (!(child instanceof HttpFormRecordControl)) continue;
            return child.getMacroContext();
        }

        return null;
    }

    private _onFormRecordChanged(): void {
        let children = this.children();
        if (children.length == 0) return;
        let lastChild = <HttpFormRecordControl>children[children.length - 1];
        let formRecord = lastChild.getFormRecord();
        if (formRecord.name != "" || formRecord.value != "")
            this._addEmptyFormRecordControl();

        this.raise(this.eventFormBodyChanged);
    }

    private _onFocusOut(e): void {
        let sender = <HttpFormRecordControl>(<Div>e.target.aflonElement).parent();
        if (!sender) return;
        if (sender == this.children()[this.children().length - 1]) return;

        let formRecord = sender.getFormRecord();

        if (formRecord.name == "" && formRecord.value == "")
            this.removeChild(sender);
    }

    private _addEmptyFormRecordControl(): void {
        let formRecordControl = new HttpFormRecordControl();
        formRecordControl
            .on(formRecordControl.eventFormRecordChanged, () => this._onFormRecordChanged())
            .on(formRecordControl.eventFocusOut, e => this._onFocusOut(e))
            .on(formRecordControl.eventFocusLeaveRequested, e => this._onFocusLeaveRequested(e));

        this.append([
            formRecordControl
        ]);
    }

    private _removeEmptyFormRecordControl(): void {
        let children = this.children();
        if (children.length == 0) return;
        let lastChild = <HttpFormRecordControl>children[children.length - 1];
        let formRecord = lastChild.getFormRecord();
        if (formRecord.name == "" && formRecord.value == "")
            this.removeChild(lastChild);
    }

    private _onFocusLeaveRequested(e: Event): void {
        let sender = typeAflonTarget(e, HttpFormRecordControl);

        if (!sender) return;

        let children = this.children();
        let numOfHeaders = children.length;
        let index = children.indexOf(sender);
        let direction = <FocusLeaveDirection>e["detail"]["direction"];

        if (direction == FocusLeaveDirection.Up) {
            if (index == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpFormRecordControl> children[index - 1]).setCaretPositionAtStart();
        } else if (direction == FocusLeaveDirection.Down) {
            if (index == numOfHeaders - 1 || numOfHeaders == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpFormRecordControl> children[index + 1]).setCaretPositionAtStart();
        } else if (direction == FocusLeaveDirection.Left || direction == FocusLeaveDirection.Backspace) {
            if (index == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpFormRecordControl> children[index - 1]).setCaretPositionAtEnd();
        } else if (direction == FocusLeaveDirection.Right) {
            if (index == numOfHeaders - 1 || numOfHeaders == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpFormRecordControl> children[index + 1]).setCaretPositionAtStart();
        }
    }
}

HttpFormBodyControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap"
    }
};
