import { AbstractTextBox, Div, TextBox } from "aflon";

import { AuthType, HttpAuth, IMacroSource } from "../../../lib/http";
import { Tooltip } from "../../ContextMenu";

import { Icon } from "../../Icon";
import { Colors, FontStyles } from "../../StyleConstants";
import { SimpleModals } from "../../Modals";

import { AuthDefinitionControl } from "./AuthDefinitionControl";
import { WItem } from "./WItem";

export class HttpAuthWitem extends WItem implements IMacroSource {
    private _header: Div;
    private _expander: Div;
    private _methodDescriptor: Div;
    private _name: AbstractTextBox;
    private _pinButton: Div;
    private _closeButton: Div;
    private _sendButton: Div;
    private _editor: AuthDefinitionControl;
    private _authTooltip: Tooltip;

    private _auth: HttpAuth;
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
                        .setText("Auth")
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
                        .setText("Auth")
                        .on(this._sendButton.eventClick, () => this._onAuth())
                ]),
            (this._editor = new AuthDefinitionControl())
                .on(this._editor.eventAuthDefinitionChanged, () => this._onAuthDefChanged())
        ]);

        (this._authTooltip = new Tooltip(this._sendButton));
    }

    getMacroNames(): Array<string> {
        return this._editor.getMacroNames();
    }

    setItem(auth: HttpAuth): this {
        if (this._auth == auth) return this;

        this._auth = auth;
        this._name.setText(this._auth.getName());
        this._editor.setAuthDefinition(auth.getAuthDefinition(), auth.getAuthLocation());
        this._updateAuthButton();
        this._auth.on(this._auth.eventNameChanged, this._onAuthNameChange);
        return this;
    }

    getItem(): HttpAuth {
        return this._auth;
    }

    setExpanded(expanded: boolean): this {
        if (!this._pinned) return this;
        if (expanded == this._expanded) return this;

        this._expanded = expanded;

        if (this._expanded) {
            this._expander.setInlineCss({ transform: "rotate(90deg)" });
            this._editor.setVisibility(true);
        } else {
            this._expander.setInlineCss({ transform: "none" });
            this._editor.setVisibility(false);
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

    private _updateAuthButton(): void {
        if (this._auth.getAuthDefinition().type == AuthType.OAuth2) {
            this._sendButton.setInlineCss({
                cursor: "pointer",
                color: Colors.workspaceDescriptor
            });
            this._authTooltip.setText("Execute OAuth flow and obtain authentication data.");
        } else {
            this._sendButton.setInlineCss({
                cursor: "default",
                color: Colors.workspacePlaceholder
            });
            this._authTooltip.setText("Selected authentication method does not need to be executed in order to obtain authentication data.");
        }
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
        if (this._auth == null) return;
        this._auth.setName(this._name.getText().trim());
    }

    private _onPinButtonClick(): void {
        this.pin();
    }

    private _onCloseButtonClick(): void {
        this.raise(this.eventCloseRequested);
    }

    private _onAuthDefChanged(): void {
        this._auth
            .setAuthDefinition(this._editor.getAuthDefinition())
            .setAuthLocation(this._editor.getAuthLocation());
        this._updateAuthButton();
        this.raise(this.eventCollectionItemChanged);
    }

    private async _onAuth(): Promise<void> {
        if (this._auth.getAuthDefinition().type != AuthType.OAuth2) return;

        let result = await this._auth.authorize();
        if (result)
            SimpleModals.alert(`There was an error during authentication: ${result}`);
        else
            SimpleModals.alert("Authentication was successful. Token is saved and will be added to requests which use this authentication method.");
    }

    private _onAuthNameChange = (): void => {
        this._name.setText(this._auth.getName());
    };
}

HttpAuthWitem.style = {
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
        ...FontStyles.sansSerifBold,
        color: Colors.methodOther,
        letterSpacing: "-0.5px",
        fontSize: "12px",
        lineHeight: "40px",
        height: "100%",
        width: "32px",
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
        color: Colors.workspacePlaceholder,
        flex: "0 0 fit-content",
        height: "100%",
        textAlign: "center",
        lineHeight: "40px",
        fontSize: "13px",
        paddingRight: "15px",
        paddingLeft: "8px",
        cursor: "pointer"
    },
    _editor: {
        marginLeft: "52px",
        marginTop: "10px",
        marginBottom: "20px"
    }
};
