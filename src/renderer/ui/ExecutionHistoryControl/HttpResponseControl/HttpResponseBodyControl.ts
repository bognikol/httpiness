import { Div, Span, Br } from "aflon";

import { HttpResponseBody, IMacroContext } from "../../../lib/http";
import { showSaveDialog } from "../../../lib/SystemDialogs";
import { openFileInDefaultApp } from "../../../lib/Platform";

import { Colors, FontStyles } from "../../StyleConstants";
import { SelectBox } from "../../BasicControls";
import { ExpandableRow } from "../../ExpandableTable";

import { HttpResponseBodyTextPreviewer, ResponseBodyTextFormatting } from "./HttpResponseBodyTextPreviewer";
import { WebView } from "./WebView";

enum PreviewFormat {
    None = "none",
    TextPlain = "plain",
    TextJSON = "json",
    TextXML = "xml",
    Image = "image",
    InBrowser = "inbrowser"
}

class HttpResponseBodyHeaderControl extends Div {
    public eventOpenRequested = "openRequested";
    public eventSaveRequested = "saveRequested";
    public eventPreviewFormatChanged = "previewFormatChanged";

    private _messageContainer: Span;
    private _controlBox: Span;
    private _message: Span;
    private _previewSelectBox: SelectBox;
    private _saveBtn: Span;
    private _openBtn: Span;

    constructor() {
        super();

        this.append([
            (this._messageContainer = new Span())
                .append([
                    (this._message = new Span())
                        .setText("Some text"),
                    new Br()
                ]),
            (this._controlBox = new Span())
                .append([
                    (this._saveBtn = new Span())
                        .setText("Save to file")
                        .on(this._saveBtn.eventClick, () => this.raise(this.eventSaveRequested)),
                    new Span().setText(" | "),
                    (this._openBtn = new Span())
                        .setText("Open in default app")
                        .on(this._openBtn.eventClick, () => this.raise(this.eventOpenRequested)),
                    new Span().setText(" | "),
                    new Span().setText("Preview as "),
                    (this._previewSelectBox = new SelectBox())
                        .insertOptions([
                            { text: "None",            value: PreviewFormat.None },
                            { text: "Text - Plain",    value: PreviewFormat.TextPlain },
                            { text: "Text - JSON",     value: PreviewFormat.TextJSON },
                            { text: "Browser preview", value: PreviewFormat.InBrowser },
                            { text: "Image",           value: PreviewFormat.Image }
                        ])
                        .on(this._previewSelectBox.eventChange, () => this.raise(this.eventPreviewFormatChanged))
                ])
        ]);
    }

    setPreviewSelectBoxDisabled(disabled: boolean): this {
        this._previewSelectBox.setDisabled(disabled);
        return this;
    }

    getPreviewSelectBoxDisabled(): boolean {
        return this._previewSelectBox.getDisabled();
    }

    setMessage(message: string): this {
        if (!message) {
            this._messageContainer.setInlineCss({ display: "none" });
            this._message.setText("");
        } else {
            this._messageContainer.setInlineCss({ display: "inline" });
            this._message.setText(message);
        }

        return this;
    }

    getMessage(): string {
        return this._message.getText();
    }

    setPreviewFormat(previewFormat: PreviewFormat): this {
        this._previewSelectBox.setSelectedOption(previewFormat);
        return this;
    }

    getPreviewFormat(): PreviewFormat {
        return <PreviewFormat>(this._previewSelectBox.getSelectedOption().value);
    }

    setControlBoxVisibility(visible: boolean): this {
        if (visible == this.getControlBoxVisibility()) return this;

        if (visible) {
            this._controlBox.setInlineCss({ display: "inline" });
        } else {
            this._controlBox.setInlineCss({ display: "none" });
        }

        return this;
    }

    getControlBoxVisibility(): boolean {
        return this._controlBox.getInlineCss()["display"] != "none";
    }
}

HttpResponseBodyHeaderControl.style = {
    _: {
        ...FontStyles.sansSerifNormal,
        color: Colors.workspaceDefault,
        fontSize: "12px",
        lineHeight: "20px"
    },
    _controlBox: {
        whiteSpace: "nowrap"
    },
    _saveBtn: {
        ...FontStyles.sansSerifBold,
        cursor: "pointer",
        textDecoration: "underline"
    },
    _openBtn: {
        ...FontStyles.sansSerifBold,
        cursor: "pointer",
        textDecoration: "underline"
    },
    _messageContainer: {
        display: "none",
        whiteSpace: "nowrap"
    },
    _searchBox: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        background: "none",
        lineHeight: "20px",
        height: "22px",
        border: `1px solid ${Colors.consoleDefault}`,
        marginLeft: "5px",
        marginRight: "5px",
        "&:focus": {
            outline: "none"
        }
    }
};

export class HttpResponseBodyControl extends ExpandableRow {
    public eventSearchResultsUpdated = "searchResultsUpdated";

    private _textPreviewer: HttpResponseBodyTextPreviewer;
    private _imagePreviewer: Div;
    private _browserPreviewer: WebView;
    private _controlBar: HttpResponseBodyHeaderControl;

    private _body: HttpResponseBody = null;
    private _macroContext: IMacroContext = null;

    constructor() {
        super();

        this.setTitle("Body");
        this.appendContent([
            (this._controlBar = new HttpResponseBodyHeaderControl())
                .on(this._controlBar.eventPreviewFormatChanged, () => this._onPreviewFormatChanged())
                .on(this._controlBar.eventSaveRequested, () => this._onSaveRequested())
                .on(this._controlBar.eventOpenRequested, () => this._onOpenInDefaultAppRequested())
                .addCssClass({
                    marginBottom: "20px"
                }),
            (this._textPreviewer = new HttpResponseBodyTextPreviewer())
                .addCssClass({
                    minWidth: 0,
                    overflowX: "scroll"
                })
                .on(this._textPreviewer.eventSearchResultsUpdated, e => this.raise(this.eventSearchResultsUpdated, e["detail"])),
            (this._imagePreviewer = new Div())
                .addCssClass({
                    minWidth: 0,
                    width: "80%",
                    minHeight: "500px",
                    maxHeight: "800px",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat"
                }),
            (this._browserPreviewer = new WebView())
                .addCssClass({
                    minWidth: 0,
                    flex: "1 1 1px",
                    marginRight: "20px"
                })
        ]);

        this.addCssClass({ marginBottom: "20px" });
    }

    setBody(body: HttpResponseBody, macroContext: IMacroContext = null): this {
        if (this._body == body) return this;

        this._body = body;
        this._macroContext = macroContext;
        this._controlBar.setPreviewSelectBoxDisabled(false);

        if (this._body.getContentSize() == 0) {
            this._controlBar.setMessage("Response body is empty.");
            this._controlBar.setControlBoxVisibility(false);
            this._controlBar.setPreviewFormat(PreviewFormat.None);
        } else {
            this._controlBar.setControlBoxVisibility(true);

            const type = body.getContentType().getBaseType();
            const subtype = body.getContentType().getSubtype();

            if (subtype.includes("json") ||
                subtype == "xml" ||
                subtype == "html" ||
                type == "text") {
                if (this._body.getContentSize() > 700 * 1024) {
                    this._controlBar.setMessage("Textual body is too large to be previewed in httpiness.");
                    this._controlBar.setPreviewFormat(PreviewFormat.None);
                    this._controlBar.setPreviewSelectBoxDisabled(true);
                } else {
                    if (subtype.includes("json")) {
                        this._controlBar.setMessage("");
                        this._controlBar.setPreviewFormat(PreviewFormat.TextJSON);
                    } else if (subtype == "html") {
                        this._controlBar.setMessage("");
                        this._controlBar.setPreviewFormat(PreviewFormat.InBrowser);
                    } else if (type == "text" || subtype.includes("xml")) {
                        this._controlBar.setMessage("");
                        this._controlBar.setPreviewFormat(PreviewFormat.TextPlain);
                    }
                }
            } else if (type == "image") {
                this._controlBar.setMessage("");
                this._controlBar.setPreviewFormat(PreviewFormat.Image);
            } else {
                this._controlBar.setMessage(`httpiness does not support preview of content type ${this._body.getContentType().getType()}.`);
                this._controlBar.setPreviewFormat(PreviewFormat.None);
            }
        }

        this._onPreviewFormatChanged();

        return this;
    }

    setSearchPhrase(phrase: string): this {
        this._textPreviewer.setSearchPhrase(phrase);
        return this;
    }

    getSearchPhrase(): string {
        return this._textPreviewer.getSearchPhrase();
    }

    searchFocusNext(): this {
        this._textPreviewer.searchFocusNext();
        return this;
    }

    searchFocusPrevious(): this {
        this._textPreviewer.searchFocusPrevious();
        return this;
    }

    private _onPreviewFormatChanged(): void {
        const previewType = this._controlBar.getPreviewFormat();

        if (previewType == PreviewFormat.Image) {
            this._textPreviewer.setInlineCss({ display: "none" });
            this._browserPreviewer.setInlineCss({ display: "none" });
            this._imagePreviewer.setInlineCss({
                display: "block",
                backgroundImage: `url('${this._body.getTempFilePosixStyle()}')`
            });
        } else if (previewType == PreviewFormat.TextJSON) {
            this._browserPreviewer.setInlineCss({ display: "none" });
            this._imagePreviewer.setInlineCss({ display: "none" });
            this._textPreviewer.setInlineCss({ display: "inline-block" });
            this._textPreviewer.setText(this._body.toString("utf-8"), ResponseBodyTextFormatting.JSON, this._macroContext);
        } else if (previewType == PreviewFormat.InBrowser) {
            this._browserPreviewer.setInlineCss({ display: "inline-block" });
            this._textPreviewer.setInlineCss({ display: "none" });
            this._imagePreviewer.setInlineCss({ display: "none" });
            this._browserPreviewer.setContent(this._body);
        } else if (previewType == PreviewFormat.TextPlain) {
            this._browserPreviewer.setInlineCss({ display: "none" });
            this._textPreviewer.setInlineCss({ display: "inline-block" });
            this._imagePreviewer.setInlineCss({ display: "none" });
            this._textPreviewer.setText(this._body.toString("utf-8"), ResponseBodyTextFormatting.Plain, this._macroContext);
        } else {
            this._browserPreviewer.setInlineCss({ display: "none" });
            this._textPreviewer.setInlineCss({ display: "none" });
            this._imagePreviewer.setInlineCss({ display: "none" });
        }
    }

    private async _onSaveRequested(): Promise<void> {
        const extensions = this._body.getContentType().getExtensions();

        let filters = [];
        if (extensions.length > 0)
            filters.push({ name: this._body.getContentType().getDefaultExtension() + " file", extensions });

        const result = await showSaveDialog({
            title: "Save file as...",
            filters,
            properties: [ "createDirectory", "showOverwriteConfirmation" ]
        });

        if (result.canceled) return;

        this._body.toFile(result.filePath);
    }

    private _onOpenInDefaultAppRequested(): void {
        openFileInDefaultApp(this._body.getTempFile());
    }
}
