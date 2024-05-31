import { AbstractTextBox, Div, TextBox } from "aflon";

import { HttpReqt, HttpRequest, HttpRequestMethod } from "../../../lib/http";

import { HttpRequestControl } from "../../HttpRequestControl";
import { UrlControlMode } from "../../HttpRequestControl/UrlControl";
import { Icon } from "../../Icon";
import { PreferenceStore } from "../../PreferenceStore";
import { Colors, FontStyles, getMethodColor, getShortMethodDesignation } from "../../StyleConstants";

import { AuthExpandableRow } from "./AuthExpandableRow";
import { WItem } from "./WItem";

export class HttpReqtWitem extends WItem {
    private _header: Div;
    private _expander: Div;
    private _methodDescriptor: Div;
    private _name: AbstractTextBox;
    private _pinButton: Div;
    private _closeButton: Div;
    private _sendButton: Div;
    private _editor: HttpRequestControl;
    private _authControl: AuthExpandableRow;

    private _reqt: HttpReqt;
    private _expanded: boolean = true;
    private _pinned: boolean = false;

    constructor() {
        super();

        this.append([
            (this._header = new Div())
                .append([
                    (this._expander = new Div())
                        .setText("•")
                        .on(this._expander.eventClick, () => this._onExpanderClick())
                        .on(this._expander.eventDblClick, () => this._onExpanderDblClick()),
                    (this._methodDescriptor = new Div())
                        .setText("OTH")
                        .on(this._methodDescriptor.eventClick, () => this._onExpanderClick())
                        .on(this._methodDescriptor.eventDblClick, () => this._onExpanderDblClick()),
                    (this._name = new TextBox())
                        .on(this._name.eventChange, () => this._onNameChange())
                        .setInlineCss({ fontStyle: "italic" })
                        .setText("Untitled request"),
                    (this._pinButton = new Div())
                        .append([ new Icon("pin")])
                        .on(this._pinButton.eventClick, () => this._onPinButtonClick()),
                    (this._closeButton = new Div())
                        .append([ new Icon("close")])
                        .on(this._closeButton.eventClick, () => this._onCloseButtonClick()),
                    (this._sendButton = new Div())
                        .setText("Send")
                        .on(this._sendButton.eventClick, async () => this.raise(this.eventSendRequested, {
                            reqt: this._reqt
                        }))
                ]),
            (this._editor = new HttpRequestControl())
                .setDescriptorShown(!PreferenceStore.getHideRequestDescriptor())
                .setUrlEditMode(PreferenceStore.getPreferSingleLineUrl() ?
                    UrlControlMode.SingleLine : UrlControlMode.MultiLineTable)
                .on(this._editor.eventMethodChanged,  () => this._onMethodChanged())
                .on(this._editor.eventUrlChanged,     () => this._onUrlChanged())
                .on(this._editor.eventHeadersChanged, () => this._onHeadersChanges())
                .on(this._editor.eventBodyChanged,    () => this._onBodyChanged())
                .on(this._editor.eventSendRequested, async () => this.raise(this.eventSendRequested, {
                    reqt: this._reqt
                }))
                .on(this._editor.eventRevertBodyToDefaultRequested, () => this._onRevertBodyToDefaultRequested())
                .on(this._editor.eventSaveCurrentBodyAsDefaultRequested, () => this._onSaveCurrentBodyAsDefaultRequested()),
            (this._authControl = new AuthExpandableRow())
                .setDescriptorShown(!PreferenceStore.getHideRequestDescriptor())
        ]);

        PreferenceStore
            .on(PreferenceStore.eventHideRequestDescriptorChanged, this._onPreferenceStoreHideRequestLabelsChanged)
            .on(PreferenceStore.eventPreferSingleLineUrlChanged, this._onPreferenceStorePreferSingleLineUrlChanged);
    }

    getMacroNames(): Array<string> {
        let macros = [...this._reqt.getMacroNames()];

        this._reqt.getAuthMacroNames().forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        return macros;
    }

    setItem(reqt: HttpReqt): this {
        if (this._reqt != null) {
            this._reqt
                .off(this._reqt.eventUrlChanged,     this._onRequestChanged)
                .off(this._reqt.eventHeadersChanged, this._onRequestChanged)
                .off(this._reqt.eventBodyChanged,    this._onRequestChanged)
                .off(this._reqt.eventNameChanged,    this._onRequestNameChanged)
                .off(this._reqt.eventAuthChanged,    this._onRequestAuthChanged);
        }

        this._reqt = reqt;

        if (reqt == null) {
            this._methodDescriptor.setText(getShortMethodDesignation(HttpRequestMethod.GET));
            this._methodDescriptor.setInlineCss({ color: getMethodColor(HttpRequestMethod.GET) });
            this._name.setText("Undefined request");
            this._editor.setHttpRequest(new HttpRequest(), null);
            return this;
        }

        this._methodDescriptor.setText(getShortMethodDesignation(this._reqt.getRawHttpRequest().method));
        this._methodDescriptor.setInlineCss({ color: getMethodColor(this._reqt.getRawHttpRequest().method) });
        this._name.setText(this._reqt.getName());
        this._editor.setHttpRequest(this._reqt.getRawHttpRequest(), this._reqt.getContainingCollection());

        this._authControl.setReqt(reqt);

        this._reqt
            .on(this._reqt.eventUrlChanged,     this._onRequestChanged)
            .on(this._reqt.eventHeadersChanged, this._onRequestChanged)
            .on(this._reqt.eventBodyChanged,    this._onRequestChanged)
            .on(this._reqt.eventNameChanged,    this._onRequestNameChanged)
            .on(this._reqt.eventAuthChanged,    this._onRequestAuthChanged);

        return this;
    }

    getItem(): HttpReqt {
        return this._reqt;
    }

    setExpanded(expanded: boolean): this {
        if (!this._pinned) return this;
        if (expanded == this._expanded) return this;

        this._expanded = expanded;

        if (this._expanded) {
            this._expander.setInlineCss({ transform: "rotate(90deg)" });
            this._editor.setVisibility(true);
            this._authControl.setVisibility(true);
        } else {
            this._expander.setInlineCss({ transform: "none" });
            this._editor.setVisibility(false);
            this._authControl.setVisibility(false);
        }

        return this;
    }

    getExpanded(): boolean {
        return this._expanded;
    }

    pin(): this {
        if (this._pinned) return this;

        this._pinButton.setInlineCss({ display: "none" });
        this._expander.setText("▶");
        this._expander.setInlineCss({ fontSize: "12px" });
        this._name.setInlineCss({ fontStyle: "normal" });
        this._pinned = true;

        return this;
    }

    isPinned(): boolean {
        return this._pinned;
    }

    focusName(): this {
        setTimeout(() => {
            this._name.focus();
            (<HTMLInputElement>(this._name.getHtmlElement())).select();
        }, 100);

        return this;
    }

    protected _onLeavingDom(): void {
        PreferenceStore
            .off(PreferenceStore.eventHideRequestDescriptorChanged, this._onPreferenceStoreHideRequestLabelsChanged)
            .off(PreferenceStore.eventPreferSingleLineUrlChanged, this._onPreferenceStorePreferSingleLineUrlChanged);
    }

    private _onExpanderClick(): void {
        if (!this._pinned) return;

        this.setExpanded(!this.getExpanded());
    }

    private _onExpanderDblClick(): void {
        if (this._pinned) return;

        this.pin();
    }

    private _onNameChange(): void {
        if (this._reqt == null) return;
        this._reqt.setName(this._name.getText().trim());
    }

    private _onMethodChanged(): void {
        if (this._reqt == null) return;

        this._reqt.setMethod(this._editor.getHttpMethod());

        this._methodDescriptor.setText(getShortMethodDesignation(this._reqt.getRawHttpRequest().method));
        this._methodDescriptor.setInlineCss({ color: getMethodColor(this._reqt.getRawHttpRequest().method) });
    }

    private _onUrlChanged(): void {
        if (this._reqt == null) return;
        this._reqt.setUrl(this._editor.getUrl());
    }

    private _onSaveCurrentBodyAsDefaultRequested(): void {
        if (this._reqt == null) return;
        this._reqt.saveCurrentBodyAsDefault();
    }

    private _onRevertBodyToDefaultRequested(): void {
        if (this._reqt == null) return;
        this._reqt.revertBodyToDefault();
        this._editor.setHttpRequest(this._reqt.getRawHttpRequest(), this._reqt.getContainingCollection());
    }

    private _onHeadersChanges(): void {
        if (this._reqt == null) return;
        this._reqt.setHeaders(this._editor.getHeaders());
    }

    private _onBodyChanged(): void {
        if (this._reqt == null) return;
        this._reqt.setBody(this._editor.getBody());
    }

    private _onPinButtonClick(): void {
        if (!this._pinned)
            this.pin();
    }

    private _onCloseButtonClick(): void {
        this.raise(this.eventCloseRequested);
    }

    private _onRequestChanged = (): void => {
        this.raise(this.eventCollectionItemChanged);
    };

    private _onRequestNameChanged = (): void => {
        this._name.setText(this._reqt.getName());
    };

    private _onRequestAuthChanged = (): void => {
        this.raise(this.eventCollectionItemChanged);
    };

    private _onPreferenceStoreHideRequestLabelsChanged = (): void => {
        this._editor.setDescriptorShown(!PreferenceStore.getHideRequestDescriptor());
        this._authControl.setDescriptorShown(!PreferenceStore.getHideRequestDescriptor());
    };

    private _onPreferenceStorePreferSingleLineUrlChanged = (): void => {
        this._editor.setUrlEditMode(
            PreferenceStore.getPreferSingleLineUrl() ?
                UrlControlMode.SingleLine : UrlControlMode.MultiLineTable
        );
    };
}

HttpReqtWitem.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        borderBottom: `solid 1px ${Colors.workspaceLine}`
    },
    _header: {
        display: "flex",
        flexFlow: "row nowrap",
        height: "40px",
        ...FontStyles.sansSerifNormal
    },
    _expander: {
        flex: "0 0 50px",
        height: "100%",
        color: Colors.workspaceDescriptor,
        lineHeight: "40px",
        fontSize: "30px",
        textAlign: "center",
        transform: "rotate(90deg)",
        cursor: "pointer"
    },
    _methodDescriptor: {
        ...FontStyles.sansSerifExtraBold,
        color: Colors.methodOther,
        fontSize: "12px",
        lineHeight: "40px",
        height: "100%",
        flex: "0 0 32px",
        cursor: "pointer"
    },
    _name: {
        flex: "1 1 200px",
        height: "100%",
        ...FontStyles.sansSerifNormal,
        color: Colors.workspaceDescriptor,
        border: "none",
        outline: "none",
        background: "none",
        userSelect: "text"
    },
    _pinButton: {
        flex: "0 0 25px",
        height: "25px",
        lineHeight: "25px",
        marginTop: "8px",
        color: Colors.workspaceDescriptor,
        fontSize: "14px",
        paddingTop: "1px",
        textAlign: "center",
        cursor: "pointer",
        marginRight: "2px"
    },
    _closeButton: {
        flex: "0 0 25px",
        lineHeight: "25px",
        marginTop: "8px",
        paddingTop: "1px",
        color: Colors.workspaceDescriptor,
        fontSize: "13px",
        height: "25px",
        textAlign: "center",
        cursor: "pointer"
    },
    _sendButton: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDescriptor,
        flex: "0 0 fit-content",
        height: "100%",
        textAlign: "center",
        lineHeight: "40px",
        cursor: "pointer",
        fontSize: "13px",
        paddingRight: "15px",
        paddingLeft: "8px"
    },
    _editor: {
        marginTop: "10px"
    },
    _authControl: {
        marginBottom: "20px"
    }
};
