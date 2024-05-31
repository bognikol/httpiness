import { Div } from "aflon";

import { HttpRequestMethod, IMacroSource, IReadOnlyMacroContext } from "../../lib/http";

import { CaretPosition, FocusLeaveDirection, IKeyboardNavigable } from "../IKeyboardNavigable";
import { Colors, FontStyles } from "../StyleConstants";
import { TokenTextEditor, Line, RegularToken } from "../TokenTextEditor";
import { ExpandableRow } from "../ExpandableTable";
import { ContextMenu, ContextMenuItemType, ContextMenuShowTrigger } from "../ContextMenu";
import { Icon } from "../Icon";

import { UrlTextEditor, UrlTextEditorMode } from "./UrlTextEditor";

class HttpMethodTextEditor extends TokenTextEditor {
    private _currentlySelectedMethod: HttpRequestMethod = HttpRequestMethod.NONE;

    constructor() {
        super();

        this.setSpaceInsertionAllowed(false)
            .setTextFilter(input => input.toUpperCase().substr(0, 7).trim());
    }

    setHttpMethod(method: HttpRequestMethod): this {
        this.setText(method);
        return this;
    }

    getHttpMethod(): HttpRequestMethod {
        return this._currentlySelectedMethod;
    }

    protected _tokenize(newText: string): Array<Line> {
        let newTextCap = newText;
        let methodColor = Colors.workspaceDefault;

        if (newTextCap == HttpRequestMethod.GET) {
            methodColor = Colors.methodGet;
            this._currentlySelectedMethod = HttpRequestMethod.GET;
        } else if (newTextCap == HttpRequestMethod.POST) {
            methodColor = Colors.methodPost;
            this._currentlySelectedMethod = HttpRequestMethod.POST;
        } else if (newTextCap == HttpRequestMethod.PUT) {
            methodColor = Colors.methodPut;
            this._currentlySelectedMethod = HttpRequestMethod.PUT;
        } else if (newTextCap == HttpRequestMethod.DELETE) {
            methodColor = Colors.methodDelete;
            this._currentlySelectedMethod = HttpRequestMethod.DELETE;
        } else {
            methodColor = Colors.workspaceDefault;
            if (newTextCap in HttpRequestMethod) {
                this._currentlySelectedMethod = HttpRequestMethod[newTextCap];
            } else {
                this._currentlySelectedMethod = HttpRequestMethod.NONE;
            }
        }

        return [ new Line().setTokens([ new RegularToken(newTextCap).setInlineCss({ color: methodColor }) ]) ];
    }
}

HttpMethodTextEditor.style = {
    _: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        fontSize: "15px",
        height: "20px",
        display: "inline-block",
        minWidth: 0,
        maxWidth: "60px",
        "&:focus": {
            border: "none",
            outline: "none"
        }
    }
};

export enum UrlControlMode {
    SingleLine, MultiLine, MultiLineTable
}

export class UrlControl extends ExpandableRow implements IMacroSource, IKeyboardNavigable {
    public eventMethodChanged = "methodChanged";
    public eventUrlChanged = "urlChanged";
    public eventSendRequested = "sendRequested";
    public eventFocusLeaveRequested = "focusLeaveRequested";
    public eventCurlCommandPasted = "curlCommandPasted";

    private _urlControlMode: UrlControlMode = UrlControlMode.MultiLineTable;

    private _urlEditorContainer: Div;
    private _descriptorTable: Div;
    private _editorContainer: Div;
    private _methodTextEditor: HttpMethodTextEditor;
    private _methodDropDownButton: Icon;
    private _methodDropDownMenu: ContextMenu;
    private _urlTextEditor: UrlTextEditor;

    private readonly _descTblMethod:   Div = new Div().setText("Method");
    private readonly _descTblProtocol: Div = new Div().setText("Protocol");
    private readonly _descTblHost:     Div = new Div().setText("Host");
    private readonly _descTblPath:     Div = new Div().setText("Path");
    private readonly _descTblQuery:    Div = new Div().setText("Query");
    private readonly _descTblHash:     Div = new Div().setText("Hash");

    constructor() {
        super();

        this.setTitle("URL");
        this.appendContent([
            (this._urlEditorContainer = new Div())
                .addCssClass({
                    display: "flex",
                    flexFlow: "row nowrap"
                })
                .append([
                    (this._descriptorTable = new Div())
                        .addCssClass({
                            ...FontStyles.sansSerifBold,
                            color: Colors.workspaceDescriptor,
                            width: "45px",
                            fontSize: "11px",
                            textAlign: "right",
                            lineHeight: "20px",
                            marginRight: "10px"
                        }),
                    (this._editorContainer = new Div())
                        .addCssClass({
                            flex: "1 0 200px",
                            display: "flex",
                            flexFlow: "column nowrap",
                            minWidth: 0
                        })
                        .append([
                            new Div().append([
                                (this._methodTextEditor = new HttpMethodTextEditor())
                                    .setHttpMethod(HttpRequestMethod.GET)
                                    .on(this._methodTextEditor.eventFocusLeaveRequested, e => this._onMethodFocusLostRequested(e))
                                    .on(this._methodTextEditor.eventInput, () => this._onMethodChange()),
                                (this._methodDropDownButton = new Icon("more"))
                                    .setVisibility(false)
                                    .addCssClass({
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        width: "15px",
                                        color: Colors.workspaceDefault,
                                        transform: "rotate(90deg)",
                                        textAlign: "center",
                                        position: "relative"
                                    })
                            ])
                                .addCssClass({
                                    marginRight: "10px",
                                    display: "flex",
                                    flexFlow: "row nowrap"
                                }),
                            (this._urlTextEditor = new UrlTextEditor())
                                .setText("")
                                .setEditorMode(UrlTextEditorMode.MultiLine)
                                .setPlaceholder("Enter URL")
                                .on(this._urlTextEditor.eventInput, () => this._onUrlInput())
                                .on(this._urlTextEditor.eventChange, () => this._onUrlChange())
                                .on(this._urlTextEditor.eventSendRequested, () => this._onSendRequested())
                                .on(this._urlTextEditor.eventFocusLeaveRequested, e => this._onUrlFocusLeaveRequested(e))
                                .on(this._urlTextEditor.eventCurlCommandPasted, e => this.raise(this.eventCurlCommandPasted, e["detail"]))
                                .addCssClass({
                                    flex: "1 1 1px",
                                    overflowX: "scroll",
                                    "&::-webkit-scrollbar": {
                                        display: "none"
                                    }
                                })
                        ])
                ])
        ]);

        this.on(this.eventMouseEnter, () => this._onMouseEnter())
            .on(this.eventMouseLeave, () => this._onMouseLeave());

        (this._methodDropDownMenu = new ContextMenu(this._methodDropDownButton, [
            { text: "GET", id: "GET", type: ContextMenuItemType.Button },
            { text: "POST", id: "POST", type: ContextMenuItemType.Button },
            { text: "PUT", id: "PUT", type: ContextMenuItemType.Button },
            { text: "DELETE", id: "DELETE", type: ContextMenuItemType.Button },
            { text: "CONNECT", id: "CONNECT", type: ContextMenuItemType.Button },
            { text: "HEAD", id: "HEAD", type: ContextMenuItemType.Button },
            { text: "OPTIONS", id: "OPTIONS", type: ContextMenuItemType.Button },
            { text: "PATCH", id: "PATCH", type: ContextMenuItemType.Button },
            { text: "TRACE", id: "TRACE", type: ContextMenuItemType.Button }
        ], ContextMenuShowTrigger.OnClickEvent))
            .on(this._methodDropDownMenu.eventSelected, (e) => this._onMethodDropDownMethodMenuSelected(e));
    }

    setUrl(url: string): this {
        this._urlTextEditor.setText(url);
        return this;
    }

    getUrl(): string {
        return this._urlTextEditor.getText();
    }

    setHttpMethod(method: HttpRequestMethod): this {
        this._methodTextEditor.setHttpMethod(method);
        return this;
    }

    getHttpMethod(): HttpRequestMethod {
        return this._methodTextEditor.getHttpMethod();
    }

    setMacroContext(macroContext: IReadOnlyMacroContext): this {
        this._urlTextEditor.setMacroContext(macroContext);
        return this;
    }

    getMacroContext(): IReadOnlyMacroContext {
        return this._urlTextEditor.getMacroContext();
    }

    getMacroNames(): Array<string> {
        return this._urlTextEditor.getMacroNames();
    }

    setUrlControlMode(mode: UrlControlMode): this {
        if (this._urlControlMode == mode) return this;

        this._urlControlMode = mode;

        if (this._urlControlMode == UrlControlMode.SingleLine) {
            this._urlTextEditor.setEditorMode(UrlTextEditorMode.SingleLine);
            this._descriptor.setExpanded(false);
            this._methodDropDownButton.setVisibility(true);
            this._descriptorTable.setInlineCss({ display: "none" });
            this._editorContainer.setInlineCss({ flexDirection: "row" });
        } else if (this._urlControlMode == UrlControlMode.MultiLine) {
            this._urlTextEditor.setEditorMode(UrlTextEditorMode.MultiLine);
            this._descriptor.setExpanded(true);
            this._methodDropDownButton.setVisibility(false);
            this._descriptorTable.setInlineCss({ display: "none" });
            this._editorContainer.setInlineCss({ flexDirection: "column" });
        } else {
            this._urlTextEditor.setEditorMode(UrlTextEditorMode.MultiLine);
            this._descriptor.setExpanded(true);
            this._methodDropDownButton.setVisibility(false);
            this._descriptorTable.setInlineCss({ display: "block" });
            this._editorContainer.setInlineCss({ flexDirection: "column" });
        }

        return this;
    }

    getUrlControlMode(): UrlControlMode {
        return this._urlControlMode;
    }

    setCaretPosition(position: CaretPosition): this {
        if (position.row == 0) {
            this._methodTextEditor.setCaretPosition(position);
            return this;
        }

        if (position.row != -1)
            position.row = position.row - 1;

        this._urlTextEditor.setCaretPosition(position);
        return this;
    }

    getCaretPosition(): CaretPosition {
        let urlCaretPosition = this._urlTextEditor.getCaretPosition();

        if (urlCaretPosition != null) {
            urlCaretPosition.row = urlCaretPosition.row + 1;
            return urlCaretPosition;
        }

        return this._methodTextEditor.getCaretPosition();
    }

    protected _executeExpand(expanded: boolean): void {
        if (!expanded) {
            this.setUrlControlMode(UrlControlMode.SingleLine);
        } else {
            this.setUrlControlMode(UrlControlMode.MultiLineTable);
        }
        this._methodDropDownButton.setVisibility(true);
    }

    private _onUrlInput(): void {
        const newUrl = this._urlTextEditor.getUrl();
        const newUrlNumberOfQueryLines = this._urlTextEditor.getNumberOfQueryLines();

        this._descriptorTable.empty();
        this._descriptorTable.append([ this._descTblMethod ]);

        if (newUrl.protocol)
            this._descriptorTable.append([ this._descTblProtocol ]);

        this._descriptorTable.append([ this._descTblHost ]);

        if (newUrl.path)
            this._descriptorTable.append([ this._descTblPath ]);

        if (newUrl.query) {
            this._descriptorTable.append([ this._descTblQuery ]);

            for (let i = 0; i <= newUrlNumberOfQueryLines - 2; i++)
                this._descriptorTable.append([ new Div().setInlineCss({ height: "20px" }) ]);
        }

        if (newUrl.hash)
            this._descriptorTable.append([ this._descTblHash ]);
    }

    private _onMethodChange(): void {
        this.raise(this.eventMethodChanged);
    }

    private _onUrlChange(): void {
        this.raise(this.eventUrlChanged);
    }

    private _onSendRequested(): void {
        this.raise(this.eventUrlChanged);
        this.raise(this.eventSendRequested);
    }

    private _onMethodDropDownMethodMenuSelected(e): void {
        this._methodTextEditor.setText(e["detail"]["id"]);
    }

    private _onMouseEnter(): void {
        if (!this.getExpanded()) return;
        this._methodDropDownButton.setVisibility(true);
    }

    private _onMouseLeave(): void {
        if (!this.getExpanded()) return;
        this._methodDropDownButton.setVisibility(false);
    }

    private _onUrlFocusLeaveRequested(e: Event): void {
        let direction = <FocusLeaveDirection> e["detail"]["direction"];

        switch (direction) {
            case FocusLeaveDirection.Up:
                this._methodTextEditor.setCaretPosition({ row: 0, column: 0 });
                break;
            case FocusLeaveDirection.Backspace:
            case FocusLeaveDirection.Left:
                this._methodTextEditor.setCaretPosition({ row: -1, column: -1 });
                break;
            case FocusLeaveDirection.Down:
            case FocusLeaveDirection.Right:
                this.raise(this.eventFocusLeaveRequested, { direction });
                break;
        }
    }

    private _onMethodFocusLostRequested(e: Event): void {
        let direction = <FocusLeaveDirection> e["detail"]["direction"];

        switch (direction) {
            case FocusLeaveDirection.Up:
            case FocusLeaveDirection.Backspace:
            case FocusLeaveDirection.Left:
                this.raise(this.eventFocusLeaveRequested, { direction });
                break;
            case FocusLeaveDirection.Down:
            case FocusLeaveDirection.Right:
                this._urlTextEditor.setCaretPosition({ row: 0, column: 0 });
                break;
        }
    }
}
