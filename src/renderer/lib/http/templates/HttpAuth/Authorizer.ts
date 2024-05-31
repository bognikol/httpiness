/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/naming-convention */

import { IReadOnlyMacroContext, MacroedText } from "../../Macro";

import { ApiKeyAuthDefinition, AuthDefinition, AuthType, BasicAuthDefinition,
    BearerAuthDefinition, OAuth2AuthDefinition } from "./AuthDefinition";
import { OAuth2Authorizer } from "./OAuth2";

export type AuthorizationValue = string | Record<string, string>;

export interface AuthorizationResult {
    value: AuthorizationValue;
    error: string;
}

export class Authorizer {
    static async authorize(def: AuthDefinition, cnt: IReadOnlyMacroContext): Promise<AuthorizationResult> {
        if (!def) return null;

        switch (def.type) {
            case AuthType.ApiKey: return await Authorizer._apiKey_getAV(def, cnt);
            case AuthType.Bearer: return await Authorizer._bearer_getAV(def, cnt);
            case AuthType.Basic:  return await Authorizer._basic_getAV(def, cnt);
            case AuthType.OAuth2: return await Authorizer._oauth2_getAV(def, cnt);
            default:              return { value: null, error: null };
        }
    }

    private static async _replaceMacros(text: string, macroContext: IReadOnlyMacroContext): Promise<string> {
        let macroedText = MacroedText.parse(text);

        for (let macro of macroedText.getMacroNames()) {
            const macroValue = await macroContext.getMacroValue(macro);
            text = text.replace("${" + macro + "}", macroValue);
        }
        return text;
    }

    private static async _apiKey_getAV(def: ApiKeyAuthDefinition, cnt: IReadOnlyMacroContext): Promise<AuthorizationResult> {
        return { value: await Authorizer._replaceMacros(def.apiKey, cnt), error: null };
    }

    private static async _bearer_getAV(def: BearerAuthDefinition, cnt: IReadOnlyMacroContext): Promise<AuthorizationResult> {
        return { value: await Authorizer._replaceMacros(def.bearerToken, cnt), error: null };
    }

    private static async _basic_getAV(def: BasicAuthDefinition, cnt: IReadOnlyMacroContext): Promise<AuthorizationResult> {
        let username = await Authorizer._replaceMacros(def.username, cnt);
        let password = await Authorizer._replaceMacros(def.password, cnt);

        return { value: btoa(`${username}:${password}`), error: null };
    }

    private static async _oauth2_getAV(def: OAuth2AuthDefinition, cnt: IReadOnlyMacroContext): Promise<AuthorizationResult> {
        return await OAuth2Authorizer.authorize(def, cnt);
    }
}
