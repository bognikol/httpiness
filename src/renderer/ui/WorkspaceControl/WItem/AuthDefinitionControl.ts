import { Div, ILabeled, AbstractInput, AbstractSelectBox, ISelectOption, AbstractTextBox } from "aflon";

import { AuthDefinition, AuthLocation, AuthLocationType, AuthType, IMacroSource } from "../../../lib/http";
import { OAuth2ClientAuthentication, OAuth2Type, PkceCodeChallengeMethod } from "../../../lib/http";
import { UrlTextEditor } from "../../HttpRequestControl";
import { UrlTextEditorMode } from "../../HttpRequestControl/UrlTextEditor";

import { Colors, FontStyles } from "../../StyleConstants";
import { MacroedTextEditor } from "../../TokenTextEditor";
import { SelectBox } from "../../BasicControls";

export class LabeledInput<A extends AbstractInput> extends Div implements ILabeled, AbstractInput {
    public eventChange: string = "labeledChanged";
    public eventInput: string  = "labeledInput";

    private _label: Div;
    private _input: A;

    constructor(Cons: { new(): A }) {
        super();

        this.append([
            (this._label = new Div()),
            (this._input = (new Cons()))
                .on(this._input.eventChange, () => this.raise(this.eventChange))
                .on(this._input.eventInput, () => this.raise(this.eventInput))
        ]);
    }

    setDisabled(disabled: boolean): this {
        this._input.setDisabled(disabled);
        return this;
    }

    getDisabled(): boolean {
        return this._input.getDisabled();
    }

    focus(): void {
        this._input.focus();
    }

    blur(): void {
        this._input.blur();
    }

    getInput(): A {
        return this._input;
    }

    setLabel(label: string): this {
        this._label.setText(label);
        return this;
    }

    getLabel(): string {
        return this._label.getText();
    }

    setText(text: string): this {
        this._input.setText(text);
        return this;
    }

    getText(): string {
        return this._input.getText();
    }
}

LabeledInput.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        height: "20px",
        alignItems: "baseline"
    },
    _label: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDescriptor,
        fontSize: "11px",
        lineHeight: "20px",
        marginRight: "10px",
        whiteSpace: "nowrap"
    },
    _input: {
        flex: "1 0 1px"
    }
};

export class LabeledTextBox<T extends AbstractTextBox> extends LabeledInput<T> implements AbstractTextBox {
    setReadOnly(readOnly: boolean): this {
        this.getInput().setReadOnly(readOnly);
        return this;
    }

    getReadOnly(): boolean {
        return this.getInput().getReadOnly();
    }

    setPlaceholder(placeholderText: string): this {
        this.getInput().setPlaceholder(placeholderText);
        return this;
    }

    getPlaceholder(): string {
        return this.getInput().getPlaceholder();
    }
}

export class LabeledMacroedTextEditor extends LabeledTextBox<MacroedTextEditor> {
    constructor() {
        super(MacroedTextEditor);

        this.getInput().addCssClass({
            overflowX: "scroll",
            "&::-webkit-scrollbar": {
                display: "none"
            }
        });
    }
}

class SingleLineUrlTextEditor extends UrlTextEditor {
    constructor() {
        super();
        this.setEditorMode(UrlTextEditorMode.SingleLine)
            .setPlaceholder("...");
    }
}

export class LabeledSingleLineUrlTextEditor extends LabeledTextBox<SingleLineUrlTextEditor> {
    constructor() {
        super(SingleLineUrlTextEditor);
    }
}

export class LabeledSelectBox extends LabeledInput<SelectBox> implements AbstractSelectBox {
    eventSelected: string = "labeledSelected";

    constructor() {
        super(SelectBox);
        this.getInput().on(this.getInput().eventSelected, () => this.raise(this.eventSelected));
    }

    insertOption(option: ISelectOption): this {
        this.getInput().insertOption(option);
        return this;
    }

    removeOption(optionValue: string): this {
        this.getInput().removeOption(optionValue);
        return this;
    }

    insertOptions(options: ISelectOption[]): this {
        this.getInput().insertOptions(options);
        return this;
    }

    setSelectedOption(optionValue: string): this {
        this.getInput().setSelectedOption(optionValue);
        return this;
    }

    getSelectedOption(): ISelectOption {
        return this.getInput().getSelectedOption();
    }

    getAllOptions(): ISelectOption[] {
        return this.getInput().getAllOptions();
    }
}

class Buffer extends Div {}

Buffer.style = {
    _: { height: "10px" }
};

export class AuthDefinitionControl extends Div implements IMacroSource {
    eventAuthDefinitionChanged = "authDefinitionChanged";

    private _currentlyVisibleParams: Div;

    private _type: LabeledSelectBox;

    private _apiKeyParams: Div;
    private _apiKey: LabeledMacroedTextEditor;
    private _appendTo: LabeledSelectBox;
    private _key: LabeledMacroedTextEditor;

    private _bearerParams: Div;
    private _bearerToken: LabeledMacroedTextEditor;

    private _basicParams: Div;
    private _username: LabeledMacroedTextEditor;
    private _password: LabeledMacroedTextEditor;

    private _oauth2Params: Div;
    private _oauth2Type: LabeledSelectBox;
    private _pkceChallengeMethod: LabeledSelectBox;
    private _callbackURL: LabeledSingleLineUrlTextEditor;
    private _authURL: LabeledSingleLineUrlTextEditor;
    private _accessTokenURL: LabeledSingleLineUrlTextEditor;
    private _clientID: LabeledMacroedTextEditor;
    private _clientSecret: LabeledMacroedTextEditor;
    private _clientAuthentication: LabeledSelectBox;
    private _scope: LabeledMacroedTextEditor;
    private _state: LabeledMacroedTextEditor;
    private _authorizationHeaderPrefix: LabeledMacroedTextEditor;

    constructor() {
        super();

        this.append([
            (this._type = new LabeledSelectBox)
                .setLabel("Type")
                .insertOptions([
                    { text: "None",    value: AuthType.None },
                    { text: "Api key", value: AuthType.ApiKey },
                    { text: "Bearer",  value: AuthType.Bearer },
                    { text: "Basic",   value: AuthType.Basic },
                    { text: "OAuth2",  value: AuthType.OAuth2 }
                ])
                .on(this._type.eventChange, () => this._onAuthTypeInput()),
            this._apiKeyParams = new Div()
                .append([
                    (this._apiKey = new LabeledMacroedTextEditor())
                        .setLabel("API key")
                        .on(this._apiKey.eventChange, this._onParamChanged),
                    (this._appendTo = new LabeledSelectBox())
                        .setLabel("Add to")
                        .insertOptions([
                            { text: "Headers", value: AuthLocationType.Header },
                            { text: "URL query", value: AuthLocationType.UrlQuery }
                        ])
                        .on(this._appendTo.eventChange, this._onAppendToChange)
                        .on(this._appendTo.eventChange, this._onParamChanged),
                    (this._key = new LabeledMacroedTextEditor())
                        .setLabel("Header key")
                        .setText("Authorization")
                        .on(this._key.eventChange, this._onParamChanged)
                ])
                .setVisibility(false),
            this._bearerParams = new Div()
                .append([
                    (this._bearerToken = new LabeledMacroedTextEditor)
                        .setLabel("Token")
                        .on(this._bearerToken.eventChange, this._onParamChanged)
                ])
                .setVisibility(false),
            this._basicParams = new Div()
                .append([
                    (this._username = new LabeledMacroedTextEditor)
                        .setLabel("Username")
                        .on(this._username.eventChange, this._onParamChanged),
                    (this._password = new LabeledMacroedTextEditor)
                        .setLabel("Password")
                        .on(this._password.eventChange, this._onParamChanged)
                ])
                .setVisibility(false),
            this._oauth2Params = new Div()
                .append([
                    (this._oauth2Type = new LabeledSelectBox)
                        .setLabel("Flow type")
                        .insertOptions([
                            { text: "Authorization code", value: OAuth2Type.AuthorizationCode },
                            { text: "Implicit", value: OAuth2Type.Implicit },
                            { text: "Client credentials", value: OAuth2Type.ClientCredentials }
                        ])
                        .on(this._oauth2Type.eventChange, this._onOAuth2TypeChanged),
                    (this._pkceChallengeMethod = new LabeledSelectBox())
                        .setLabel("PKCE challenge")
                        .insertOptions([
                            { text: "None", value: PkceCodeChallengeMethod.None },
                            { text: "Plain", value: PkceCodeChallengeMethod.Plain },
                            { text: "SHA256", value: PkceCodeChallengeMethod.SHA256 }
                        ])
                        .on(this._pkceChallengeMethod.eventChange, this._onParamChanged),
                    new Buffer(),
                    (this._callbackURL = new LabeledSingleLineUrlTextEditor())
                        .setLabel("Callback URL")
                        .on(this._callbackURL.eventChange, this._onParamChanged),
                    (this._authURL = new LabeledSingleLineUrlTextEditor())
                        .setLabel("Auth URL")
                        .on(this._authURL.eventChange, this._onParamChanged),
                    (this._accessTokenURL = new LabeledSingleLineUrlTextEditor())
                        .setLabel("Token URL")
                        .on(this._accessTokenURL.eventChange, this._onParamChanged),
                    new Buffer(),
                    (this._clientID = new LabeledMacroedTextEditor())
                        .setLabel("Client ID")
                        .on(this._clientID.eventChange, this._onParamChanged),
                    (this._clientSecret = new LabeledMacroedTextEditor())
                        .setLabel("Client secret")
                        .on(this._clientSecret.eventChange, this._onParamChanged),
                    (this._clientAuthentication = new LabeledSelectBox())
                        .setLabel("Pass client credentials")
                        .insertOptions([
                            { text: "As basic authentication", value: OAuth2ClientAuthentication.BasicAuthentication },
                            { text: "In URL-encoded body", value: OAuth2ClientAuthentication.InBody }
                        ])
                        .on(this._clientSecret.eventChange, this._onParamChanged),
                    new Buffer(),
                    (this._scope = new LabeledMacroedTextEditor())
                        .setLabel("Scope")
                        .on(this._scope.eventChange, this._onParamChanged),
                    (this._state = new LabeledMacroedTextEditor())
                        .setLabel("State")
                        .on(this._state.eventChange, this._onParamChanged),
                    new Buffer(),
                    (this._authorizationHeaderPrefix = new LabeledMacroedTextEditor())
                        .setLabel("Authorization header prefix")
                        .on(this._state.eventChange, this._onParamChanged)
                ])
                .setVisibility(false)
        ]);
    }

    setAuthDefinition(auth: AuthDefinition, location: AuthLocation = null): this {
        if (auth == null) return this;

        this._type.setSelectedOption(auth.type);
        this._updateAuthParams(auth, location);
        this._updateApiKeyLabel();

        return this;
    }

    getAuthDefinition(): AuthDefinition {
        let type: AuthType = <AuthType>(this._type.getSelectedOption().value);

        if (type == AuthType.None) {
            return { type };
        } else if (type == AuthType.ApiKey) {
            return { type, apiKey: this._apiKey.getText() };
        } else if (type == AuthType.Bearer) {
            return { type, bearerToken: this._bearerToken.getText() };
        } else if (type == AuthType.Basic) {
            return {
                type,
                username: this._username.getText(),
                password: this._password.getText()
            };
        } else if (type == AuthType.OAuth2) {
            return {
                type,
                oauth2Type: <OAuth2Type> this._oauth2Type.getSelectedOption().value,
                codeChallengeMethod: <PkceCodeChallengeMethod> this._pkceChallengeMethod.getSelectedOption().value,
                callbackURL: this._callbackURL.getText(),
                authURL: this._authURL.getText(),
                accessTokenURL: this._accessTokenURL.getText(),
                clientID: this._clientID.getText(),
                clientSecret: this._clientSecret.getText(),
                clientAuthentication: <OAuth2ClientAuthentication> this._clientAuthentication.getSelectedOption().value,
                scope: this._scope.getText(),
                state: this._state.getText()
            };
        } else {
            throw new Error(`Unsupported auth type ${type}`);
        }
    }

    getAuthLocation(): AuthLocation {
        let type: AuthType = <AuthType>(this._type.getSelectedOption().value);
        if (type == AuthType.ApiKey) {
            return {
                type: <AuthLocationType> this._appendTo.getSelectedOption().value,
                key: this._key.getText(),
                prefix: ""
            };
        }

        if (type == AuthType.OAuth2 && this._authorizationHeaderPrefix.getText().trim() != "Bearer") {
            return {
                type: AuthLocationType.Header,
                key: "Authorization",
                prefix: this._authorizationHeaderPrefix.getText()
            };
        }

        return null;
    }

    getMacroNames(): Array<string> {
        if (!this._currentlyVisibleParams) return [];

        let macros: Array<string> = [];

        this._currentlyVisibleParams.children().forEach(child => {
            if (child instanceof LabeledMacroedTextEditor) {
                child.getInput().getMacroNames().forEach(macro => {
                    if (macros.indexOf(macro) == -1)
                        macros.push(macro);
                });
            }
        });

        return macros;
    }

    private _onAuthTypeInput(): void {
        let type: AuthType = <AuthType>(this._type.getSelectedOption().value);
        this._updateAuthParams({ type }, this.getAuthLocation());
        this.raise(this.eventAuthDefinitionChanged);
    }

    private _updateAuthParams(authDef: AuthDefinition = { type: AuthType.None }, location: AuthLocation = null): void {
        if (this._currentlyVisibleParams)
            this._currentlyVisibleParams.setVisibility(false);

        if (authDef.type == AuthType.ApiKey) {
            this._apiKeyParams.setVisibility(true);
            this._apiKey.setText(authDef.apiKey ?? "");
            if (location) {
                this._appendTo.setSelectedOption(location.type);
                this._key.setText(location.key ?? "Authorization");
            } else {
                this._appendTo.setSelectedOption(AuthLocationType.Header);
                this._key.setText("Authorization");
            }
            this._currentlyVisibleParams = this._apiKeyParams;
        } else if (authDef.type == AuthType.Bearer) {
            this._bearerParams.setVisibility(true);
            this._bearerToken.setText(authDef.bearerToken ?? "");
            this._currentlyVisibleParams = this._bearerParams;
        } else if (authDef.type == AuthType.Basic) {
            this._basicParams.setVisibility(true);
            this._username.setText(authDef.username ?? "");
            this._password.setText(authDef.password ?? "");
            this._currentlyVisibleParams = this._basicParams;
        } else if (authDef.type == AuthType.OAuth2) {
            this._oauth2Params.setVisibility(true);
            this._oauth2Type.setSelectedOption(authDef.oauth2Type ?? OAuth2Type.AuthorizationCode);
            this._callbackURL.setText(authDef.callbackURL ?? "");
            this._authURL.setText(authDef.authURL ?? "");
            this._accessTokenURL.setText(authDef.accessTokenURL ?? "");
            this._clientID.setText(authDef.clientID ?? "");
            this._clientSecret.setText(authDef.clientSecret ?? "");
            this._clientAuthentication.setSelectedOption(authDef.clientAuthentication ?? OAuth2ClientAuthentication.InBody);
            this._pkceChallengeMethod.setSelectedOption(authDef.codeChallengeMethod ?? PkceCodeChallengeMethod.None);
            this._scope.setText(authDef.scope ?? "");
            this._state.setText(authDef.state ?? "");

            if (location && location.prefix)
                this._authorizationHeaderPrefix.setText(location.prefix);
            else
                this._authorizationHeaderPrefix.setText("Bearer");

            this._updateOAuth2Params(<OAuth2Type> this._oauth2Type.getSelectedOption().value);
            this._currentlyVisibleParams = this._oauth2Params;
        } else {
            this._currentlyVisibleParams = null;
        }
    }

    private _updateOAuth2Params(oauth2Type: OAuth2Type): void {
        if (oauth2Type == OAuth2Type.ClientCredentials) {
            this._pkceChallengeMethod.setVisibility(false);
            this._authURL.setVisibility(false);
            this._accessTokenURL.setVisibility(true);
            this._callbackURL.setVisibility(false);
            this._clientSecret.setVisibility(true);
            this._state.setVisibility(false);
            this._clientAuthentication.setVisibility(true);
        } else if (oauth2Type == OAuth2Type.Implicit) {
            this._pkceChallengeMethod.setVisibility(false);
            this._authURL.setVisibility(true);
            this._accessTokenURL.setVisibility(false);
            this._callbackURL.setVisibility(true);
            this._clientSecret.setVisibility(false);
            this._state.setVisibility(true);
            this._clientAuthentication.setVisibility(false);
        } else {
            this._pkceChallengeMethod.setVisibility(true);
            this._authURL.setVisibility(true);
            this._accessTokenURL.setVisibility(true);
            this._callbackURL.setVisibility(true);
            this._clientSecret.setVisibility(true);
            this._state.setVisibility(true);
            this._clientAuthentication.setVisibility(true);
        }
    }

    private _onParamChanged = (): void => {
        this.raise(this.eventAuthDefinitionChanged);
    };

    private _onOAuth2TypeChanged = (): void => {
        this._updateOAuth2Params(<OAuth2Type> this._oauth2Type.getSelectedOption().value);
        this.raise(this.eventAuthDefinitionChanged);
    };

    private _onAppendToChange = (): void => {
        this._updateApiKeyLabel();
    };

    private _updateApiKeyLabel(): void {
        if (this._appendTo.getSelectedOption().value == AuthLocationType.Header) {
            this._key.setLabel("Header name");
        } else {
            this._key.setLabel("Query key");
        }
    }
}

AuthDefinitionControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _apiKeyParams: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _bearerParams: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _basicParams: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _oauth2Params: {
        display: "flex",
        flexFlow: "column nowrap"
    }
};
