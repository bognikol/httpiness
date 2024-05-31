import { ipcRenderer } from "electron";

import { HttpExecutor } from "../../executors";
import { HttpBodyContentType, HttpRequest, HttpRequestMethod, HttpTextBody } from "../../HttpRequest";
import { IReadOnlyMacroContext, MacroedText } from "../../Macro";

import { OAuth2AuthDefinition, OAuth2ClientAuthentication as OAuth2ClientAuthentication, OAuth2Type, PkceCodeChallengeMethod } from "./AuthDefinition";
import { AuthorizationResult } from "./Authorizer";

export class OAuth2Authorizer {
    private _definition: OAuth2AuthDefinition;
    private _macroResolvedDefinition: OAuth2AuthDefinition;
    private _macroContext: IReadOnlyMacroContext;
    private _codeVerifier: string = null;

    constructor(definition: OAuth2AuthDefinition, macroContext: IReadOnlyMacroContext) {
        this._definition = definition;
        this._macroContext = macroContext;
    }

    public static async authorize(definition: OAuth2AuthDefinition, macroContext: IReadOnlyMacroContext): Promise<AuthorizationResult> {
        return new OAuth2Authorizer(definition, macroContext)._authorize();
    }

    private static async _showOAuth2Window(url: string, redirectHost: string, queryKey: string): Promise<string> {
        return await <Promise<string>>(ipcRenderer.invoke("oauth2", url, redirectHost, queryKey));
    }

    private static _generateCodeVerifier(): string {
        let array = new Uint32Array(56 / 2);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ("0" + dec.toString(16)).substr(-2)).join("");
    }

    private static _isValidUrl(url: string): boolean {
        try {
            let parsedUrl = new URL(url);
            return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        } catch {
            return false;
        }
    }

    private async _generateSha256CodeChallenge(): Promise<string> {
        let data = new TextEncoder().encode(this._codeVerifier);
        let bytes = new Uint8Array(await window.crypto.subtle.digest("SHA-256", data));

        let str = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            str += String.fromCharCode(bytes[i]);
        }

        return btoa(str)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    private async _authorize(): Promise<AuthorizationResult> {

        try {
            this._macroResolvedDefinition = await this._replaceMacrosInAuthDefinition();
            let validationResult = this._validateAuthDefinition();

            if (validationResult != null)
                return { value: null, error: validationResult };

            let result: AuthorizationResult = null;

            if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.AuthorizationCode) {
                result = await this._doAuthorizationCodeFlow();
            } else if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.Implicit) {
                result = await this._doImplicitFlow();
            } else if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.ClientCredentials) {
                result = await this._doClientCredentialsFlow();
            }

            this._macroResolvedDefinition = null;
            return result;
        } catch (ex) {
            return { value: null, error: String(ex) };
        }
    }

    private async _replaceMacrosInString(text: string): Promise<string> {
        if (!text) return text;

        let macroedText = MacroedText.parse(text);

        for (let macro of macroedText.getMacroNames()) {
            const macroValue = await this._macroContext.getMacroValue(macro);
            text = text.replace("${" + macro + "}", macroValue);
        }

        return text;
    }

    private async _replaceMacrosInAuthDefinition(): Promise<OAuth2AuthDefinition> {
        let def = this._definition;

        let [ callbackURL, authURL, accessTokenURL, clientID, clientSecret, scope, state ] =
            await Promise.all([
                def.callbackURL, def.authURL, def.accessTokenURL, def.clientID,
                def.clientSecret, def.scope, def.state]
                .map(input => this._replaceMacrosInString(input)));

        return {
            type: def.type,
            oauth2Type: def.oauth2Type,
            codeChallengeMethod: def.codeChallengeMethod,
            clientAuthentication: def.clientAuthentication,
            callbackURL, authURL, accessTokenURL, clientID, clientSecret, scope, state
        };
    }

    private _validateAuthDefinition(): string {
        const errorMessage = (paramName: string): string =>
            `${paramName} cannot be empty when OAuth2 type is set to ${this._macroResolvedDefinition.oauth2Type}`;

        const notValidUrlMessage = (paramName: string): string =>
            `${paramName} must be valid URL.`;

        if (!this._macroResolvedDefinition.clientID)
            return "Client ID cannot be empty";

        if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.AuthorizationCode) {
            if (!this._macroResolvedDefinition.callbackURL)
                return errorMessage("Callback URL");
            if (!OAuth2Authorizer._isValidUrl(this._macroResolvedDefinition.callbackURL))
                return notValidUrlMessage("Callback URL");
            if (!this._macroResolvedDefinition.authURL)
                return errorMessage("Auth URL");
            if (!OAuth2Authorizer._isValidUrl(this._macroResolvedDefinition.authURL))
                return notValidUrlMessage("Auth URL");
            if (!this._macroResolvedDefinition.accessTokenURL)
                return errorMessage("Access token URL");
            if (!OAuth2Authorizer._isValidUrl(this._macroResolvedDefinition.accessTokenURL))
                return notValidUrlMessage("Access token URL");
            if (!this._macroResolvedDefinition.clientSecret)
                return errorMessage("Client secret");
            return null;
        }

        if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.Implicit) {
            if (!this._macroResolvedDefinition.callbackURL)
                return errorMessage("Callback URL");
            if (!this._macroResolvedDefinition.authURL)
                return errorMessage("Auth URL");
            return null;
        }

        if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.ClientCredentials) {
            if (!this._macroResolvedDefinition.accessTokenURL)
                return errorMessage("Access token");
            if (!this._macroResolvedDefinition.clientSecret)
                return errorMessage("Client Secret");
            return null;
        }

        return `OAuth2 authorization type ${this._macroResolvedDefinition.oauth2Type} is not supported`;
    }

    private async _doAuthorizationCodeFlow(): Promise<AuthorizationResult> {
        let url = await this._buildAuthorizationUrl("code");
        let code = await OAuth2Authorizer._showOAuth2Window(url, this._macroResolvedDefinition.callbackURL, "code");

        if (code == null) {
            return { value: null, error: "Authorization code browser error" };
        }

        return await this._doTokenRequest(code);
    }

    private async _doImplicitFlow(): Promise<AuthorizationResult> {

        let url = await this._buildAuthorizationUrl("token");
        let token = await OAuth2Authorizer._showOAuth2Window(url, this._macroResolvedDefinition.callbackURL, "access_token");

        if (token == null) {
            return { value: null, error: "Authorization code browser error" };
        }

        return { value: token, error: "" };
    }

    private async _doClientCredentialsFlow(): Promise<AuthorizationResult> {
        return await this._doTokenRequest();

    }

    private async _buildAuthorizationUrl(type: "token" | "code"): Promise<string> {

        let url = new URL(this._macroResolvedDefinition.authURL);
        url.searchParams.append("response_type", type);
        url.searchParams.append("client_id", this._macroResolvedDefinition.clientID);
        url.searchParams.append("redirect_uri", this._macroResolvedDefinition.callbackURL);
        url.searchParams.append("scope", this._macroResolvedDefinition.scope);

        if (this._macroResolvedDefinition.oauth2Type == OAuth2Type.AuthorizationCode &&
            this._macroResolvedDefinition.codeChallengeMethod != PkceCodeChallengeMethod.None) {

            this._codeVerifier = OAuth2Authorizer._generateCodeVerifier();

            if (this._macroResolvedDefinition.codeChallengeMethod == PkceCodeChallengeMethod.SHA256) {
                url.searchParams.append("code_challenge_method", "S256");
                url.searchParams.append("code_challenge", await this._generateSha256CodeChallenge());
            } else {
                url.searchParams.append("code_challenge_method", "plain");
                url.searchParams.append("code_challenge", this._codeVerifier);
            }
        }

        if (this._macroResolvedDefinition.state)
            url.searchParams.append("state", this._macroResolvedDefinition.state);

        return url.toString();
    }

    private async _doTokenRequest(authorizationCode: string = null): Promise<AuthorizationResult> {
        let request    = new HttpRequest();
        request.method = HttpRequestMethod.POST;
        request.url    = this._macroResolvedDefinition.accessTokenURL;

        let searchParams = new URLSearchParams();
        searchParams.append("client_id", this._macroResolvedDefinition.clientID);

        if (this._macroResolvedDefinition.clientAuthentication == OAuth2ClientAuthentication.BasicAuthentication) {
            let token = btoa(`${this._macroResolvedDefinition.clientID}:${this._macroResolvedDefinition.clientSecret}`);
            request.headers.push({ name: "Authorization", value: `Basic ${token}` });
        } else {
            searchParams.append("client_secret", this._macroResolvedDefinition.clientSecret);
        }

        if (authorizationCode == null) {
            searchParams.append("grant_type", "client_credentials");
        } else {
            searchParams.append("grant_type", "authorization_code");
            searchParams.append("code", authorizationCode);
            searchParams.append("redirect_uri", this._macroResolvedDefinition.callbackURL);
        }

        if (this._codeVerifier) {
            searchParams.append("code_verifier", this._codeVerifier);
        }

        let body       = new HttpTextBody();
        body.valueType = HttpBodyContentType.Text;
        body.value     = searchParams.toString();

        request.body   = body;

        let execution = await HttpExecutor.execute(request);

        try {
            if (!execution.response || execution.response.status >= 300)
                throw new Error();

            try {
                let jsonBody = JSON.parse(execution.response.body.getContent());
                return {
                    value: jsonBody["access_token"],
                    error: ""
                };
            } catch {
                try {
                    let query = new URLSearchParams(execution.response.body.getContent());
                    let accessToken = query.get("access_token");

                    if (!accessToken)
                        throw new Error();

                    return {
                        value: accessToken,
                        error: ""
                    };
                } catch {
                    throw new Error();
                }
            }
        } catch (ex) {
            let error = "";

            if (!execution.response)
                error = execution.metadata.errorMessage;
            else
                error = `Status code: ${execution.response.status}; Payload: ${execution.response.body.getContent()}`;

            return {
                value: null, error
            };
        }
    }
}
