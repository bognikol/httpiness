import { Div } from "aflon";

import { FormEncoding } from "../../../lib/http";

import { ExpandableRow } from "../../ExpandableTable";
import { CaretPosition, IKeyboardNavigable } from "../../IKeyboardNavigable";

import { HttpBody, HttpBodyContentType, HttpBodyType, HttpFormBody, HttpTextBody, IMacroSource, IReadOnlyMacroContext } from "../../../lib/http";

import { BodyFormat, HttpBodyFormatSelector } from "./HttpBodyFormatSelector";
import { HttpFileBodyControl } from "./HttpFileBodyControl";
import { HttpFormBodyControl } from "./HttpFormBodyControl";
import { BodyTextEditor, TextFormatting } from "./BodyTextEditor";

export class HttpBodyControl extends ExpandableRow implements IMacroSource, IKeyboardNavigable {
    public eventBodyChanged = "bodyChanged";
    public eventDefaultContentTypeChangeRequested = "defaultContentTypeChangeRequested";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _typeSelector: HttpBodyFormatSelector;
    private _tokenTextEditor: BodyTextEditor;
    private _fileBodyControl: HttpFileBodyControl;
    private _formBodyControl: HttpFormBodyControl;

    constructor() {
        super();

        this.setTitle("Body");
        this.appendContent([
            new Div()
                .append([
                    (this._typeSelector = new HttpBodyFormatSelector())
                        .on(this._typeSelector.eventBodyTypeChanged, () => this._onBodyTypeChanged())
                        .on(this._typeSelector.eventDefaultContentTypeRequested,
                            () => this._onDefaultContentTypeHeaderSetRequested()),
                    (this._fileBodyControl = new HttpFileBodyControl())
                        .addCssClass({ marginBottom: "10px", marginTop: "10px" })
                        .on(this._fileBodyControl.eventBodyChanged, () => this._onFileBodyChanged())
                        .on(this._fileBodyControl.eventFocusLeaveRequested, e => this.raise(this.eventFocusLeaveRequested, e["detail"])),
                    (this._formBodyControl = new HttpFormBodyControl())
                        .addCssClass({ marginBottom: "10px", marginTop: "10px" })
                        .on(this._formBodyControl.eventFormBodyChanged, () => this._onChange())
                        .on(this._formBodyControl.eventFocusLeaveRequested, e => this.raise(this.eventFocusLeaveRequested, e["detail"])),
                    (this._tokenTextEditor = new BodyTextEditor())
                        .setText("")
                        .setPlaceholder("Enter body content")
                        .addCssClass({
                            marginBottom: "10px",
                            marginTop: "10px",
                            overflowX: "scroll",
                            "&::-webkit-scrollbar": {
                                display: "none"
                            }
                        })
                        .on(this._tokenTextEditor.eventChange, () => this._onChange())
                        .on(this._tokenTextEditor.eventFocusLeaveRequested, e => this.raise(this.eventFocusLeaveRequested, e["detail"]))
                ])
                .addCssClass({
                    display: "flex",
                    flexFlow: "column nowrap"
                })
        ]);
    }

    getMacroNames(): Array<string> {
        switch (this._typeSelector.getBodyFormat()) {
            case BodyFormat.Text:
                return this._tokenTextEditor.getMacroNames();
            case BodyFormat.File:
                return this._fileBodyControl.getMacroNames();
            case BodyFormat.Form:
                return this._formBodyControl.getMacroNames();
            default:
                return [];
        }
    }

    setHttpBody(body: HttpBody): this {
        if (body == null) {
            this._typeSelector.setBodyFormat(BodyFormat.None);
            this._tokenTextEditor.setText("");
            this._fileBodyControl.setPath("");
            this._formBodyControl.setBody(null);
        } else if (body.type == HttpBodyType.Regular) {
            let textBody = <HttpTextBody>body;
            if (textBody.valueType == HttpBodyContentType.Text) {
                this._tokenTextEditor.setText(textBody.value);
                this._typeSelector.setBodyFormat(BodyFormat.Text);
            } else if (textBody.valueType == HttpBodyContentType.File) {
                this._typeSelector.setBodyFormat(BodyFormat.File);
                this._fileBodyControl.setPath(textBody.value);
            } else {
                throw new Error(`BodyContentType ${textBody.valueType} is not supported.`);
            }
        } else if (body.type == HttpBodyType.Form) {
            let formBody = <HttpFormBody>body;
            this._typeSelector.setBodyFormat(BodyFormat.Form);
            this._typeSelector.setFormEncoding(formBody.encoding);
            this._formBodyControl.setBody(formBody);
        }

        this._updateControlDependingOnBodyType();
        return this;
    }

    getHttpBody(): HttpBody {
        switch (this._typeSelector.getBodyFormat()) {
            case BodyFormat.Text: {
                let body = new HttpTextBody();
                body.valueType = HttpBodyContentType.Text;
                body.value = this._tokenTextEditor.getText();
                return body;
            }
            case BodyFormat.File: {
                let body = new HttpTextBody();
                body.valueType = HttpBodyContentType.File;
                body.value = this._fileBodyControl.getPath();
                return body;
            }
            case BodyFormat.Form: {
                let body = this._formBodyControl.getBody();
                body.encoding = this._typeSelector.getFormEncoding();
                return body;
            }
            default:
                return null;
        }
    }

    getDefaultContentType(): string {
        switch (this._typeSelector.getBodyFormat()) {
            case BodyFormat.Text: return "text/plain";
            case BodyFormat.File: return null;
            case BodyFormat.Form: {
                switch (this._typeSelector.getFormEncoding()) {
                    case FormEncoding.UrlEncoded: return "application/x-www-form-urlencoded";
                    default: return "multipart/form-data";
                }
            }
            default: return null;
        }
    }

    setMacroContext(macroContext: IReadOnlyMacroContext): this {
        this._tokenTextEditor.setMacroContext(macroContext);
        this._formBodyControl.setMacroContext(macroContext);
        return this;
    }

    getMacroContext(): IReadOnlyMacroContext {
        return this._tokenTextEditor.getMacroContext();
    }

    setCaretPosition(position: CaretPosition): this {
        if (this._tokenTextEditor.getVisibility()) {
            this._tokenTextEditor.setCaretPosition(position);
        } else if (this._fileBodyControl.getVisibility()) {
            this._fileBodyControl.setCaretPosition(position);
        } else if (this._formBodyControl.getVisibility()) {
            this._formBodyControl.setCaretPosition(position);
        }

        return this;
    }

    getCaretPosition(): CaretPosition {
        if (this._tokenTextEditor.getVisibility()) {
            return this._tokenTextEditor.getCaretPosition();
        }

        if (this._fileBodyControl.getVisibility()) {
            return this._fileBodyControl.getCaretPosition();
        }

        if (this._formBodyControl.getVisibility()) {
            return this._formBodyControl.getCaretPosition();
        }

        return null;
    }

    private _onChange(): void {
        this._typeSelector.setRevertDisabled(false);
        this.raise(this.eventBodyChanged);
    }

    private _updateControlDependingOnBodyType(): void {
        this._fileBodyControl.setVisibility(false);
        this._formBodyControl.setVisibility(false);
        this._tokenTextEditor.setVisibility(false);

        switch (this._typeSelector.getBodyFormat()) {
            case BodyFormat.Text: {
                this._tokenTextEditor.setFormatting(TextFormatting.Plain);
                this._tokenTextEditor.setVisibility(true);
                break;
            }
            case BodyFormat.File: {
                this._fileBodyControl.setVisibility(true);
                break;
            }
            case BodyFormat.Form: {
                this._formBodyControl.setVisibility(true);
                break;
            }
        }
    }

    private _onBodyTypeChanged(): void {
        this._updateControlDependingOnBodyType();
        this._typeSelector.setRevertDisabled(false);
        this.raise(this.eventBodyChanged);
    }

    private _onFileBodyChanged(): void {
        this._typeSelector.setRevertDisabled(false);
        this.raise(this.eventBodyChanged);
    }

    private _onDefaultContentTypeHeaderSetRequested(): void {
        this.raise(this.eventDefaultContentTypeChangeRequested);
    }
}
