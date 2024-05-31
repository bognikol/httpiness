import { Div } from "aflon";

import { FormEncoding } from "../../../lib/http";

import { SelectBox } from "../../BasicControls";
import { IconButton } from "../../IconButton";
import { Colors, FontStyles } from "../../StyleConstants";

export enum BodyFormat {
    None = "None",
    Text = "Text",
    File = "File",
    Form = "Form"
}

export class HttpBodyFormatSelector extends Div {
    public eventBodyTypeChanged = "bodyChanged";
    public eventDefaultContentTypeRequested = "defaultContentTypeRequested";
    public eventRevertBodyToDefaultRequested = "revertBodyToDefaultRequested";
    public eventSaveCurrentBodyAsDefaultRequested = "saveCurrentBodyAsDefaultRequested";

    private _bodyType: Div;
    private _bodyTypeSelectBox: SelectBox;
    private _formEncoding: Div;
    private _formEncodingSelectBox: SelectBox;
    private _revertIcon: IconButton;
    private _saveIcon: IconButton;

    private _bodyFormat: BodyFormat;

    constructor() {
        super();

        this.append([
            (this._bodyType = new Div())
                .append([
                    new Div().setText("Body type: "),
                    (this._bodyTypeSelectBox = new SelectBox())
                        .insertOptions([
                            { value: BodyFormat.None, text: "None" },
                            { value: BodyFormat.Text, text: "Text" },
                            { value: BodyFormat.File, text: "File" },
                            { value: BodyFormat.Form, text: "Form" }
                        ])
                        .on(this._bodyTypeSelectBox.eventSelected, () => this._onSelected())
                ]),
            (this._formEncoding = new Div())
                .append([
                    new Div().setText("Encode as: "),
                    (this._formEncodingSelectBox = new SelectBox())
                        .insertOptions([
                            { value: FormEncoding.Multipart, text: "multipart/form-data" },
                            { value: FormEncoding.UrlEncoded, text: "application/x-www-form-urlencoded" }
                        ])
                        .on(this._formEncodingSelectBox.eventSelected, () => this._onSelected())
                ])
                .setVisibility(false),
            (this._revertIcon = new IconButton("undo"))
                .setTooltip("Revert body to default value")
                .on(this._revertIcon.eventClick, () => this._onRevertIconClick()),
            (this._saveIcon = new IconButton("save"))
                .setTooltip("Save current body as the default for this request")
                .on(this._revertIcon.eventClick, () =>  this._onSaveIconClick())
        ]);
    }

    setBodyFormat(format: BodyFormat): this {
        this.setRevertDisabled(false);
        if (this._bodyFormat == format) return this;

        this._bodyFormat = format;
        this._update();

        return this;
    }

    getBodyFormat(): BodyFormat {
        return <BodyFormat> this._bodyTypeSelectBox.getSelectedOption().value;
    }

    setFormEncoding(encoding: FormEncoding): this {
        this.setRevertDisabled(false);
        this._formEncodingSelectBox.setSelectedOption(encoding);
        return this;
    }

    getFormEncoding(): FormEncoding {
        return <FormEncoding> this._formEncodingSelectBox.getSelectedOption().value;
    }

    setRevertDisabled(disabled: boolean): this {
        this._saveIcon.setDisabled(disabled);
        this._revertIcon.setDisabled(disabled);
        return this;
    }

    getRevertDisabled(): boolean {
        return this._saveIcon.getDisabled();
    }

    private _onSelected(): void {
        let newBodyFormat = this.getBodyFormat();

        this._bodyFormat = newBodyFormat;

        this._update();
        this.raise(this.eventBodyTypeChanged);

        return;
    }

    private _update(): void {
        switch (this._bodyFormat) {
            case BodyFormat.None: {
                this._bodyTypeSelectBox.setSelectedOption("None");
                this._formEncoding.setVisibility(false);
                break;
            }
            case BodyFormat.Text: {
                this._bodyTypeSelectBox.setSelectedOption("Text");
                this._formEncoding.setVisibility(false);
                break;
            }
            case BodyFormat.File: {
                this._bodyTypeSelectBox.setSelectedOption("File");
                this._formEncoding.setVisibility(false);
                break;
            }
            case BodyFormat.Form: {
                this._bodyTypeSelectBox.setSelectedOption("Form");
                this._formEncoding.setVisibility(true);
                break;
            }
            default: throw new Error(`Body format ${this._bodyFormat} is not supported.`);
        }
    }

    private _onRevertIconClick(): void {
        this.setRevertDisabled(true);
        this.raise(this.eventRevertBodyToDefaultRequested, null, true);
    }

    private _onSaveIconClick(): void {
        this.setRevertDisabled(true);
        this.raise(this.eventSaveCurrentBodyAsDefaultRequested, null, true);
    }
}

HttpBodyFormatSelector.style = {
    _: {
        ...FontStyles.sansSerifNormal,
        color: Colors.workspaceDefault,
        fontSize: "12px",
        height: "21px",
        lineHeight: "21px",
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        whiteSpace: "nowrap"
    },
    _bodyType: {
        display: "flex",
        flexFlow: "row nowrap"
    },
    _bodyTypeSelectBox: {
        marginLeft: "4px"
    },
    _formEncoding: {
        display: "flex",
        flexFlow: "row nowrap",
        marginLeft: "7px"
    },
    _formEncodingSelectBox: {
        marginLeft: "4px"
    },
    _revertIcon: {
        marginLeft: "10px",
        height: "21px",
        lineHeight: "21px"
    },
    _saveIcon: {
        height: "21px",
        lineHeight: "21px"
    }
};
