export enum AuthType {
    None   = "None",
    ApiKey = "ApiKey",
    Basic  = "Basic",
    Bearer = "Bearer",
    OAuth2 = "OAuth2"
}

export interface NoneAuthDefinition {
    readonly type: AuthType.None;
}

export interface ApiKeyAuthDefinition {
    readonly type: AuthType.ApiKey;
    readonly apiKey?: string;
}

export interface BearerAuthDefinition {
    readonly type: AuthType.Bearer;
    readonly bearerToken?: string;
}

export interface BasicAuthDefinition {
    readonly type: AuthType.Basic;
    readonly username?: string;
    readonly password?: string;
}

export enum OAuth2Type {
    AuthorizationCode = "AuthorizationCode",
    Implicit          = "Implicit",
    ClientCredentials = "ClientCredentials"
}

export enum OAuth2ClientAuthentication {
    BasicAuthentication = "BasicAuthentication",
    InBody = "InBody"
}

export enum PkceCodeChallengeMethod
{
    None   = "None",
    Plain  = "Plain",
    SHA256 = "SHA256"
}

export interface OAuth2AuthDefinition {
    readonly type: AuthType.OAuth2;
    readonly oauth2Type?: OAuth2Type;

    readonly codeChallengeMethod?: PkceCodeChallengeMethod;
    readonly clientAuthentication?: OAuth2ClientAuthentication;

    readonly callbackURL?: string;
    readonly authURL?: string;
    readonly accessTokenURL?: string;

    readonly clientID?: string;
    readonly clientSecret?: string;

    readonly scope?: string;
    readonly state?: string;
}

export type AuthDefinition = NoneAuthDefinition |
    ApiKeyAuthDefinition | BearerAuthDefinition |
    BasicAuthDefinition  | OAuth2AuthDefinition;
