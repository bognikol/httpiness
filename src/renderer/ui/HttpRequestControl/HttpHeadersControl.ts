import { Div, typeAflonTarget } from "aflon";

import { HttpHeaderRecord, IMacroSource } from "../../lib/http";

import { ExpandableRow } from "../ExpandableTable";
import { CaretPosition, FocusLeaveDirection, IKeyboardNavigable } from "../IKeyboardNavigable";

import { HttpHeaderRecordControl } from "./HttpHeaderRecordControl";

export class HttpHeadersControl extends ExpandableRow implements IMacroSource, IKeyboardNavigable {
    public eventHeadersChanged = "headersChanged";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _headerControl: Div;

    private _readOnly: boolean = false;

    constructor() {
        super();

        this.setTitle("Headers");
        this.appendContent([
            (this._headerControl = new Div())
        ]);

        this._addEmptyHeaderRecordControl();
    }

    getMacroNames(): Array<string> {
        let macros: Array<string> = [];

        this._headerControl.children().forEach(child => {
            const headerRecord = (<HttpHeaderRecordControl>child);
            headerRecord.getMacroNames().forEach(macro => {
                if (macros.indexOf(macro) == -1)
                    macros.push(macro);
            });
        });

        return macros;
    }

    setHeaders(headers: Array<HttpHeaderRecord>): this {
        this._headerControl.empty();

        headers.forEach(header => {
            let headerRcrdCtrl = new HttpHeaderRecordControl();
            headerRcrdCtrl
                .setHeaderRecord(header)
                .setReadOnly(this._readOnly)
                .on(headerRcrdCtrl.eventHeaderRecordChanged, () => this._onHeaderRecordChanged())
                .on(headerRcrdCtrl.eventFocusLeaveRequested, e => this._onFocusLeaveRequested(e))
                .on(headerRcrdCtrl.eventFocusOut, e => this._onFocusOut(e));
            this._headerControl.append([headerRcrdCtrl]);
        });

        if (!this._readOnly)
            this._addEmptyHeaderRecordControl();
        return this;
    }

    getHeaders(): Array<HttpHeaderRecord> {
        let headers: Array<HttpHeaderRecord> = [];
        this._headerControl.children().forEach(child => {
            const headerRecord = (<HttpHeaderRecordControl>child).getHeaderRecord();
            if (headerRecord.name.length != 0 ||
                headerRecord.value.length != 0)
                headers.push(headerRecord);
        });
        return headers;
    }

    setReadOnly(readOnly: boolean): this {
        if (this._readOnly == readOnly) return this;

        this._readOnly = readOnly;

        this._headerControl.children().forEach(child => {
            if (child instanceof HttpHeaderRecordControl)
                (<HttpHeaderRecordControl>child).setReadOnly(readOnly);
        });

        if (this._readOnly)
            this._removeEmptyHeaderRecordControl();
        else
            this._removeEmptyHeaderRecordControl();

        return this;
    }

    getReadOnly(): boolean {
        return this._readOnly;
    }

    setCaretPosition(position: CaretPosition): this {
        let children = this._headerControl.children();
        if (children.length == 0) return this;

        if (position.row == -1 || position.row > children.length - 1)
            position.row = children.length - 1;

        let child = children[position.row];
        if (!(child instanceof HttpHeaderRecordControl)) return this;

        child.setCaretPosition({ row: 0, column: position.column });
        return this;
    }

    getCaretPosition(): CaretPosition {
        let headers = this._headerControl.children();

        for (let i = 0; i <= headers.length - 1; i++) {
            let header = headers[i];
            if (!(header instanceof HttpHeaderRecordControl)) continue;
            let caretPosition = header.getCaretPosition();
            if (caretPosition == null) continue;

            return { row: i, column: caretPosition.column };
        }

        return null;
    }

    private _onHeaderRecordChanged(): void {
        let children = this._headerControl.children();
        if (children.length == 0) return;
        let lastChild = <HttpHeaderRecordControl>children[children.length - 1];
        let headerRecord = lastChild.getHeaderRecord();
        if (headerRecord.name != "" || headerRecord.value != "")
            this._addEmptyHeaderRecordControl();

        this.raise(this.eventHeadersChanged);
    }

    private _onFocusOut(e): void {
        let sender = <HttpHeaderRecordControl>(<Div>e.target.aflonElement).parent();
        if (!sender) return;
        if (sender == this._headerControl.children()[this._headerControl.children().length - 1]) return;

        let headerRecord = sender.getHeaderRecord();

        if (headerRecord.name == "" && headerRecord.value == "")
            this._headerControl.removeChild(sender);
    }

    private _addEmptyHeaderRecordControl(): void {
        let headerRecordControl = new HttpHeaderRecordControl();
        headerRecordControl
            .on(headerRecordControl.eventHeaderRecordChanged, () => this._onHeaderRecordChanged())
            .on(headerRecordControl.eventFocusLeaveRequested, e => this._onFocusLeaveRequested(e))
            .on(headerRecordControl.eventFocusOut, e => this._onFocusOut(e));

        this._headerControl.append([
            headerRecordControl
        ]);
    }

    private _removeEmptyHeaderRecordControl(): void {
        let children = this._headerControl.children();
        if (children.length == 0) return;
        let lastChild = <HttpHeaderRecordControl>children[children.length - 1];
        let headerRecord = lastChild.getHeaderRecord();
        if (headerRecord.name == "" && headerRecord.value == "")
            this._headerControl.removeChild(lastChild);
    }

    private _onFocusLeaveRequested(e): void {
        let sender = typeAflonTarget(e, HttpHeaderRecordControl);

        if (!sender) return;

        let children = this._headerControl.children();
        let numOfHeaders = children.length;
        let index = children.indexOf(sender);
        let direction = <FocusLeaveDirection>e["detail"]["direction"];

        if (direction == FocusLeaveDirection.Up) {
            if (index == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpHeaderRecordControl> children[index - 1]).setCaretPosition({ row: 0, column: 0 });
        } else if (direction == FocusLeaveDirection.Down) {
            if (index == numOfHeaders - 1 || numOfHeaders == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpHeaderRecordControl> children[index + 1]).setCaretPosition({ row: 0, column: 0 });
        } else if (direction == FocusLeaveDirection.Left || direction == FocusLeaveDirection.Backspace) {
            if (index == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpHeaderRecordControl> children[index - 1]).setCaretPosition({ row: -1, column: -1 });
        } else if (direction == FocusLeaveDirection.Right) {
            if (index == numOfHeaders - 1 || numOfHeaders == 0) this.raise(this.eventFocusLeaveRequested, { direction });
            else (<HttpHeaderRecordControl> children[index + 1]).setCaretPosition({ row: 0, column: 0 });
        }
    }
}
