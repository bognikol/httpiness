/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/naming-convention */
import * as fs from "fs";

import { HttpBodyContentType, HttpBodyType, HttpHeaderRecord, HttpRequestMethod, AuthLocationType, AuthType, FormEncoding } from "../../http";
import { OAuth2ClientAuthentication, OAuth2Type, PkceCodeChallengeMethod } from "../../http";
import { ConversionError, ConversionLog, ConversionResult, IThirdPartyCollectionConverter, NotSupported } from "./IThirdPartyCollectionConverter";

const ALLOWED_METHODS: Array<string> = [
    HttpRequestMethod.CONNECT,
    HttpRequestMethod.DELETE,
    HttpRequestMethod.GET,
    HttpRequestMethod.HEAD,
    HttpRequestMethod.NONE,
    HttpRequestMethod.OPTIONS,
    HttpRequestMethod.PATCH,
    HttpRequestMethod.POST,
    HttpRequestMethod.PUT,
    HttpRequestMethod.TRACE
];

type PostmanAuthRecord = unknown;
type PostmanCollection2dot1Record = unknown;
type PostmanFolderRecord = unknown;
type PostmanItemRecord = unknown;

enum AssertionType {
    String = "string", Undefined = "undefined", Object = "object", Array = "array"
}

const STR = AssertionType.String;
const UND = AssertionType.Undefined;
const OBJ = AssertionType.Object;
const ARR = AssertionType.Array;

export class Postman2dot1CollectionConverter implements IThirdPartyCollectionConverter {
    private _pathToCollection: string;
    private _notSupported: Set<NotSupported> = new Set<NotSupported>();
    private _log: ConversionLog = new ConversionLog();
    private _httpinessCollectionObject: unknown = null;

    constructor(pathToThirdPartyCollection: string) {
        this._pathToCollection = pathToThirdPartyCollection;
    }

    convert(): ConversionResult {
        let result = fs.existsSync(this._pathToCollection);

        if (!result) {
            return {
                error: ConversionError.NoFile,
                notSupported: this._notSupported
            };
        }

        try {
            let fileContent = fs.readFileSync(this._pathToCollection);
            let plainObject = JSON.parse(fileContent.toString());
            this._httpinessCollectionObject =
                this._convert_PostmanCollection2dot1_to_HttpinessCollection0dot10PO(plainObject);
        } catch (ex) {
            console.log(ex);

            let error = ConversionError.Unknown;

            if (ex instanceof SyntaxError) {
                error = ConversionError.JsonParsing;
            }

            return {
                error: error,
                notSupported: this._notSupported
            };
        }

        return {
            error: ConversionError.Success,
            notSupported: this._notSupported
        };
    }

    save(pathToHttpinessCollection: string = null, pathToConversionLog: string = null): boolean {
        try {
            if (pathToHttpinessCollection)
                fs.writeFileSync(pathToHttpinessCollection, JSON.stringify(this._httpinessCollectionObject));
            if (pathToConversionLog)
                fs.writeFileSync(pathToConversionLog, this._log.toString());
            return true;
        } catch {
            return false;
        }
    }

    //#region HELPERS

    private _replace_Parameters(input: string): string {
        if (!input) return input;
        return input.replace(new RegExp("{{", "g"), "${").replace(new RegExp("}}", "g"), "}");
    }

    private _extractFrom_ArrayOfKeyValues(input: Array<unknown>, key: string): string {
        let rcd = input.find(elem => elem["key"] == key);
        if (typeof rcd != "object") return null;

        let val = rcd["value"];
        if (typeof val != "string") return null;
        return val;
    }

    private _checkType(input: unknown, type: AssertionType): boolean {
        let result = false;

        if (type == AssertionType.Array)
            result = Array.isArray(input);
        else if (type == AssertionType.Object)
            result = !Array.isArray(input) && typeof input == type;
        else
            result = typeof input == type;

        return result;
    }

    private _check_is(input: unknown, type: AssertionType, variableName: string = null): boolean {
        let result = this._checkType(input, type);
        if (result && variableName)
            this._log.warnTypeIsNot(variableName, type, input);
        return result;
    }

    private _check_isNot(input: unknown, type: AssertionType, variableName: string = null): boolean {
        let result = !this._checkType(input, type);
        if (result && variableName)
            this._log.warnTypeIs(variableName, type, input);
        return result;
    }

    //#endregion

    //#region AUTH

    private _convert_Auth_to_HttpAuthPO(input: PostmanAuthRecord): Record<string, unknown> {
        if (this._check_is(input, UND)) return null;
        if (this._check_isNot(input, OBJ, "Authentication object"))
            return null;

        let type = input["type"];
        if (this._check_isNot(type, STR, "Authentication type"))
            return null;

        switch (type) {
            case "noauth":   return this._noauth_to_HttpAuthPO();
            case "apikey":   return this._apikey_to_HttpAuthPO(input);
            case "basic":    return this._basic_to_HttpAuthPO(input);
            case "bearer":   return this._bearer_to_HttpAuthPO(input);
            case "digest":   return this._digest_to_HttpAuthPO();
            case "hawk":     return this._hawk_to_HttpAuthPO();
            case "edgegrid": return this._edgegrid_to_HttpAuthPO();
            case "oauth1":   return this._oauth1_to_HttpAuthPO();
            case "oauth2":   return this._oauth2_to_HttpAuthPO(input);
            case "ntlm":     return this._ntlm_to_HttpAuthPO();
            case "awsv4":    return this._awsv4_to_HttpAuthPO();
        }

        this._log.warn(`No support auth type ${type}`);
        this._notSupported.add(NotSupported.AuthOther);
        return null;
    }

    private _noauth_to_HttpAuthPO(): Record<string, unknown> {
        return {
            name: "Default Auth",
            authDef: {
                type: "NoAuth"
            }
        };
    }

    private _apikey_to_HttpAuthPO(input: PostmanAuthRecord): Record<string, unknown> {
        let data = input["apikey"];

        let helper: Record<string, unknown> = {
            name: "Default Auth",
            authDef: { type: "ApiKey" },
            location: {
                type: AuthLocationType.Header,
                key: "Authorization",
                prefix: ""
            }
        };

        if (this._check_isNot(data, ARR, "ApiKey auth data"))
            return helper;

        let inParam = this._extractFrom_ArrayOfKeyValues(data, "in");

        if (inParam == "header") {
            helper.location = {
                type: AuthLocationType.Header
            };
        } else if (inParam == "query") {
            helper.location = {
                type: AuthLocationType.UrlQuery
            };
        } else {
            this._log.warn(`"In" parameter in ApiKey authentication data is invalid; expected either "query" or "header"; using "header". Actual value: ${inParam}`);
        }

        let keyRecord  = this._extractFrom_ArrayOfKeyValues(data, "key");
        let valueParam = this._extractFrom_ArrayOfKeyValues(data, "value");

        if (!keyRecord) keyRecord = "Authorization";
        helper.location["key"] = this._replace_Parameters(keyRecord);

        if (this._check_isNot(valueParam, STR, "Api key")) {
            helper.authDef["apiKey"] = "${API_KEY}";
        } else {
            helper.authDef["apiKey"] = this._replace_Parameters(valueParam);
        }

        return helper;
    }

    private _basic_to_HttpAuthPO(input: PostmanAuthRecord): Record<string, unknown> {
        let data = input["basic"];

        if (this._check_isNot(data, ARR, "Basic auth data"))
            return null;

        let username  = this._extractFrom_ArrayOfKeyValues(data, "username");
        if (username)
            username = this._replace_Parameters(username);
        else
            username = "${USERNAME}";
        let password = this._extractFrom_ArrayOfKeyValues(data, "password");
        if (password)
            password = this._replace_Parameters(password);
        else
            password = "${PASSWORD}";

        return {
            name: "Default Auth",
            authDef: {
                type: "Basic",
                username,
                password
            },
            location: null
        };
    }

    private _bearer_to_HttpAuthPO(input: PostmanAuthRecord): Record<string, unknown> {
        let data = input["bearer"];

        if (this._check_isNot(data, ARR, "Bearer auth data"))
            return null;
        if (this._check_isNot(data[0], OBJ, "Bearer auth data first element"))
            return null;

        let value = data[0]["value"];

        if (this._check_isNot(value, STR, "Property named 'value' in Bearer auth data first element"))
            return null;

        if (value)
            value = this._replace_Parameters(value);
        else
            value = "${BEARER_TOKEN}";

        return {
            name: "Default Auth",
            authDef: {
                type: "Bearer",
                bearerToken: value
            },
            location: null
        };
    }

    private _digest_to_HttpAuthPO(): Record<string, unknown> {
        this._log.warn("Auth method 'Digest' is not supported by httpiness.");
        this._notSupported.add(NotSupported.Digest);
        return null;
    }

    private _hawk_to_HttpAuthPO(): Record<string, unknown> {
        this._log.warn("Auth method 'Hawk' is not supported by httpiness.");
        this._notSupported.add(NotSupported.Hawk);
        return null;
    }

    private _edgegrid_to_HttpAuthPO(): Record<string, unknown> {
        this._log.warn("Auth method 'EdgeGrid' is not supported by httpiness.");
        this._notSupported.add(NotSupported.EdgeGrid);
        return null;
    }

    private _oauth1_to_HttpAuthPO(): Record<string, unknown> {
        this._log.warn("Auth method 'OAuth1' is not supported by httpiness.");
        this._notSupported.add(NotSupported.OAuth1);
        return null;
    }

    private _oauth2_to_HttpAuthPO(input: PostmanAuthRecord): Record<string, unknown> {
        let data = input["oauth2"];

        if (this._check_isNot(data, ARR, "OAuth2 auth data")) {
            return {
                name: "Default Auth",
                authDef: {
                    type: AuthType.OAuth2
                },
                location: null
            };
        }

        const grantType_to_OAuth2Type = (grantType: string): OAuth2Type => {
            if (!grantType || grantType == "authorization_code") return OAuth2Type.AuthorizationCode;
            if (grantType == "implicit") return OAuth2Type.Implicit;
            if (grantType == "client_credentials") return OAuth2Type.ClientCredentials;
            if (grantType == "authorization_code_with_pkce") return OAuth2Type.AuthorizationCode;

            if (grantType == "password") {
                this._notSupported.add(NotSupported.OAuth2Password);
                return null;
            }

            this._notSupported.add(NotSupported.OAuth2UnknownGrantType);
            return null;
        };

        const challengeAlgorithm_to_PkceCodeChallengeMethod = (grantType: string, challengeAlgorithm: string): PkceCodeChallengeMethod => {
            if (grantType != "authorization_code_with_pkce") return PkceCodeChallengeMethod.None;

            if (challengeAlgorithm == "plain") return PkceCodeChallengeMethod.Plain;
            return PkceCodeChallengeMethod.SHA256;
        };

        let challengeAlgorithm = this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "challengeAlgorithm"));
        let grantType = this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "grant_type"));
        let clientAuthentication = this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "client_authentication"));
        let headerPrefix = this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "headerPrefix"));


        let oauth2Type = grantType_to_OAuth2Type(grantType);
        let codeChallengeMethod = challengeAlgorithm_to_PkceCodeChallengeMethod(grantType, challengeAlgorithm);
        if (!oauth2Type) return null;

        return {
            name: "Default Auth",
            authDef: {
                type: AuthType.OAuth2,
                oauth2Type,
                codeChallengeMethod,
                callbackURL: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "redirect_uri")),
                authURL: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "authUrl")),
                accessTokenURL: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "accessTokenUrl")),
                clientID: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "clientId")),
                clientSecret: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "clientSecret")),
                scope: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "scope")),
                state: this._replace_Parameters(this._extractFrom_ArrayOfKeyValues(data, "state")),
                clientAuthentication: clientAuthentication == "body" ? OAuth2ClientAuthentication.InBody : OAuth2ClientAuthentication.BasicAuthentication
            },
            location: {
                type: AuthLocationType.Header,
                key: "Authorization",
                prefix: headerPrefix == null ? "Bearer" : headerPrefix
            }
        };
    }

    private _ntlm_to_HttpAuthPO(): Record<string, unknown> {
        this._log.warn("Auth method 'NTLM' is not supported by httpiness.");
        this._notSupported.add(NotSupported.NTLM);
        return null;
    }

    private _awsv4_to_HttpAuthPO(): Record<string, unknown> {
        this._log.warn("Auth method 'AWSv4' is not supported by httpiness.");
        this._notSupported.add(NotSupported.AWSv4);
        return null;
    }

    //#endregion AUTH

    //#region DIRECTORY AND ROOT

    private _convert_PostmanCollection2dot1_to_HttpinessCollection0dot10PO(input: PostmanCollection2dot1Record): unknown {
        // convert metadata
        let htpCollStub = this._convert_PostmanCollectionMetadata_to_HttpinessCollection0dot10Stub(input);
        if (htpCollStub == null) return htpCollStub;

        //convert items
        let folderResult = this._convert_Folder_to_HttpReqtDirPO(input, "");
        if (folderResult == null) return htpCollStub;

        htpCollStub = {
            ...htpCollStub,
            ...folderResult
        };

        delete htpCollStub.name;

        return htpCollStub;
    }

    private _convert_PostmanCollectionMetadata_to_HttpinessCollection0dot10Stub(input: PostmanCollection2dot1Record): Record<string, unknown> {
        if (this._check_isNot(input, OBJ, "Postman collection root"))
            return null;

        const info = input["info"];
        if (this._check_isNot(info, OBJ, "Collection info record"))
            return null;

        const schema = info["schema"];
        if (!this._check_isNot(schema, STR, "Collection schema")) {
            this._log.schema(String(schema));
        }

        const variables = input["variable"];
        let parameters = {};

        if (this._check_is(variables, ARR)) {
            for (let i of variables) {
                let key = i["key"];
                let value = i["value"];

                if (!this._check_isNot(key,   STR, "Variable key") &&
                    !this._check_isNot(value, STR, "Variable value")) {
                    parameters[key] = value;
                }
            }
        }

        return {
            collectionVersion: "httpiness/JSON/0.11",
            authChildren: [],
            reqtChildren: [],
            dirChildren: [],
            parameters
        };
    }

    private _convert_Folder_to_HttpReqtDirPO(input: PostmanFolderRecord, parentName: string): Record<string, unknown> {
        let dir: any = null;

        let dirName = input["name"];
        if (this._check_isNot(dirName, STR)) {
            dirName = input["info"]["name"];
            if (this._check_isNot(dirName, STR)) {
                this._log.warn("Folder does not have valid name record. Using default value.");
                dirName = "Untitled directory";
            }
        }

        this._log.dir(parentName + "/" + dirName);
        let defaultAuth = this._convert_Auth_to_HttpAuthPO(input["auth"]);

        const items = input["item"];
        if (this._check_is(items, UND)) {
            // do nothing
        } else if (this._check_isNot(items, ARR, "Parameter item of directory")) {
            return <Record<string, unknown>>dir;
        } else {
            dir = {
                name: dirName,
                reqtChildren: [],
                dirChildren: [],
                authChildren: defaultAuth ? [ defaultAuth ] : []
            };

            for (let i of items) {
                if (this._check_isNot(i["request"], UND)) {
                    let result = this._convert_Item_to_HttpReqtPO(i, `${parentName}/${dirName}`);
                    if (result != null)
                        dir.reqtChildren.push(result);
                } else if (this._check_isNot(i["item"], UND)) {
                    const result = this._convert_Folder_to_HttpReqtDirPO(i, `${parentName}/${dirName}`);//, effectiveAuth);
                    if (result != null)
                        dir.dirChildren.push(result);
                } else {
                    this._log.warn(`Directory ${dir.name} has item which in neither Request or Folder. Ignoring. Item value: ${i}.`);
                }
            }
        }

        return <Record<string, unknown>>dir;
    }

    //#endregion

    //#region REQUEST

    private _convert_Item_to_HttpReqtPO(item: PostmanItemRecord, parentName: string): unknown {
        let name = item["name"];

        if (this._check_isNot(name, STR, "Item name")) {
            name = "Untitled request";
        }

        this._log.request(parentName + "/" + name);

        let postmanRequest = item["request"];

        if (this._check_is(postmanRequest, STR)) {
            return {
                name,
                rawRequest: {
                    method: HttpRequestMethod.GET,
                    url: postmanRequest
                }
            };
        }

        if (this._check_isNot(postmanRequest, OBJ, "Item request property")) {
            return null;
        }

        let auth = null;
        if (postmanRequest["auth"])
            auth = this._convert_Auth_to_HttpAuthPO(postmanRequest["auth"]);

        let method              = this._convert_method(postmanRequest["method"]);
        let url                 = this._convert_url(postmanRequest["url"]);
        let [body, contentType] = this._convert_body(postmanRequest["body"]);
        let headers             = this._convert_header(postmanRequest["header"], contentType);

        return { name, rawRequest: { method, url, headers, body }, auth };
    }

    private _convert_method(method: unknown): HttpRequestMethod {
        if (this._check_isNot(method, STR, "Request method"))
            return HttpRequestMethod.GET;

        if (!ALLOWED_METHODS.includes(String(method))) {
            this._log.warn(`Postman method ${method} cannot be mapped to httpiness method. Using GET instead.`);
            return HttpRequestMethod.GET;
        }

        return <HttpRequestMethod>method;
    }

    private _convert_url(input: unknown): string {
        if (!input) return "";

        if (this._check_is(input, STR))
            return this._replace_Parameters(String(input));

        if (this._check_isNot(input, OBJ, "Request url"))
            return null;

        let postmanProtocol = input["protocol"];
        let postmanHost     = input["host"];
        let postmanPort     = input["port"];
        let postmanPath     = input["path"];
        let postmanQuery    = input["query"];
        let postmanHash     = input["hash"];

        let url = "";

        if (this._check_is(postmanProtocol, UND)) {
            // do nothing
        } else if (this._check_is(postmanProtocol, STR)) {
            url += postmanProtocol + "://";
        } else {
            this._log.warnTypeIsNot("Request URL protocol", "undefined/string", postmanProtocol);
        }

        if (this._check_is(postmanHost, STR)) {
            url += postmanHost;
        } else if (this._check_is(postmanHost, ARR)) {
            url += postmanHost.join(".");
        } else {
            this._log.warnTypeIsNot("Request URL host", "string/array", postmanHost);
        }

        if (this._check_is(postmanPort, UND)) {
            // do nothing
        } else if (this._check_is(postmanPort, STR)) {
            url += ":" + postmanPort;
        } else {
            this._log.warnTypeIsNot("Request URL port", "undefined/string", postmanPort);
        }

        if (this._check_is(postmanPath, UND)) {
            // do nothing
        } else if (this._check_is(postmanPath, STR)) {
            url += "/" + postmanPath;
        } else if (this._check_is(postmanPath, ARR)) {
            for (let i = 0; i <= postmanPath.length - 1; i++) {
                if (postmanPath[i][0] == ":") {
                    postmanPath[i] = "${" + (<string>postmanPath[i].slice(1)) + "}";
                }
            }
            url += "/" + postmanPath.join("/");
        } else {
            this._log.warnTypeIsNot("Request URL path", "undefined/string/array", postmanPath);
        }

        url += "?";
        if (this._check_is(postmanQuery, UND)) {
            // do nothing
        } else if (this._check_is(postmanQuery, ARR)) {
            for (const singleParam of postmanQuery) {
                if (singleParam.key == null)
                    continue;
                if (singleParam.value != null)
                    if (singleParam.disabled)
                        url += singleParam.key + "=&";
                    else
                        url += singleParam.key + "=" + singleParam.value + "&";
                else
                    url += singleParam.key + "&";
            }
        } else {
            this._log.warnTypeIsNot("Request URL query", "undefined/array", postmanQuery);
        }
        url = url.slice(0, -1);

        if (this._check_is(postmanHash, UND)) {
            // do nothing
        } else if (this._check_is(postmanHash, STR)) {
            url += postmanHash;
        } else {
            this._log.warnTypeIsNot("Request URL query", "undefined/string", postmanQuery);
        }

        return this._replace_Parameters(url);
    }

    private _convert_header(input: unknown, defaultContentType: string): Array<HttpHeaderRecord> {
        let headers: Array<HttpHeaderRecord> = [];

        if (defaultContentType) {
            if (this._check_is(input, ARR)) {
                if ((<Array<any>>input).findIndex(elem => elem.key == "Content-Type") == -1) {
                    headers.push({ name: "Content-Type", value: defaultContentType });
                }
            } else {
                headers.push({ name: "Content-Type", value: defaultContentType });
            }
        }

        if (this._check_is(input, UND)) {
            // do nothing
        } else if (this._check_is(input, ARR)) {
            for (let header of <Array<any>>input) {
                if (header["disabled"]) continue;
                const key = header["key"];
                const value = header["value"];

                if (!this._check_isNot(key, STR, "A header key") && !this._check_isNot(value, STR, "A header value")) {
                    headers.push({ name: this._replace_Parameters(key), value: this._replace_Parameters(value) });
                }
            }
        } else {
            this._log.warnTypeIsNot("Request header", "undefined/array", input);
        }

        return headers;
    }

    private _convert_body(input: unknown): [unknown, string] {
        if (this._check_is(input, UND)) return [null, null];
        if (this._check_isNot(input, OBJ, "Request body")) return [null, null];

        const mode = input["mode"];

        if (this._check_isNot(mode, STR)) {
            return [null, null];
        }

        switch (mode) {
            case "raw":        return this._raw_to_BodyHelper(input);
            case "formdata":   return this._formdata_to_BodyHelper(input);
            case "urlencoded": return this._urlencoded_to_BodyHelper(input);
            case "file":       return this._file_to_BodyHelper(input);
            case "graphql":    return this._graphql_to_BodyHelper(input);
        }

        this._log.warnTypeIsNot("Request mode", "raw/formdata/urlencoded/file/graphql", mode);
        return [null, null];
    }

    private _raw_to_BodyHelper(input: unknown): [unknown, string] {
        let content = input["raw"];

        if (this._check_isNot(content, STR, "Request body of type raw")) {
            content = "";
        }

        let contentType = "text/plain";
        let options = input["options"];

        if (this._check_is(options, UND)) {
            // do nothing
        } else if (!this._check_isNot(options, OBJ, "Request options") &&
            this._check_isNot(options["raw"], UND) &&
            !this._check_isNot(options["raw"], OBJ, "Request options for raw type")) {
            switch (options["raw"]["language"]) {
                case "json":       contentType = "application/json";       break;
                case "javaScript": contentType = "application/javascript"; break;
                case "xml":        contentType = "application/xml";        break;
                case "html":       contentType = "application/html";       break;
                default: break;
            }
        }

        return [{
            type: HttpBodyType.Regular,
            value: this._replace_Parameters(content),
            valueType: HttpBodyContentType.Text
        }, contentType];
    }

    private _formdata_to_BodyHelper(input: unknown): [unknown, string] {
        let body = {
            type: HttpBodyType.Form,
            encoding: FormEncoding.Multipart,
            records: []
        };

        let formParts = input["formdata"];

        if (this._check_isNot(formParts, ARR, "Request body of type formdata")) {
            return [body, null];
        }

        for (let part of formParts) {
            let type = part["type"];
            let key = part["key"];

            if (this._check_isNot(type, STR, "Formdata part type")) {
                continue;
            }

            if (this._check_isNot(key, STR, "Formdata part key")) {
                key = "";
            }

            if (type == "text") {
                let value = part["value"];
                if (this._check_isNot(value, STR, "Formdata part value")) {
                    value = "";
                }
                body.records.push({
                    name: this._replace_Parameters(key),
                    value: this._replace_Parameters(value),
                    type: HttpBodyContentType.Text
                });
            } else if (type == "file") {
                let value = part["src"];

                if (this._check_is(value, ARR)) {
                    this._log.warn("Request object contains array as form part value for type 'file'; using only first member.");
                    this._notSupported.add(NotSupported.MultiFileFormRecord);
                    value = value[0];
                }

                if (this._check_isNot(value, STR, "File src data")) {
                    value = "";
                }

                body.records.push({
                    name: this._replace_Parameters(key),
                    value: this._replace_Parameters(value),
                    type: HttpBodyContentType.File
                });
            }
        }

        return [body, null];
    }

    private _urlencoded_to_BodyHelper(input: unknown): [unknown, string] {
        let body = {
            type: HttpBodyType.Form,
            encoding: FormEncoding.UrlEncoded,
            records: []
        };

        let urlEncodedParts = input["urlencoded"];

        if (this._check_isNot(urlEncodedParts, ARR, "Request body of type urlencoded")) {
            return [body, null];
        }

        for (let part of urlEncodedParts) {
            let key = part["key"];
            if (this._check_isNot(key, STR, "Urlencoded part key")) {
                key = "";
            }

            let value = part["value"];
            if (this._check_isNot(value, STR, "Urlencoded part value")) {
                value = "";
            }

            body.records.push({
                name: this._replace_Parameters(key),
                value: this._replace_Parameters(value),
                type: HttpBodyContentType.Text
            });
        }

        return [body, null];
    }

    private _file_to_BodyHelper(input: unknown): [unknown, string] {
        let fileRecord = input["file"];

        let body = {
            type: HttpBodyType.Regular,
            valueType: HttpBodyContentType.File,
            value: ""
        };

        if (this._check_isNot(fileRecord, OBJ, "Request body of type file")) {
            return [body, null];
        }

        let src = fileRecord["src"];
        let content = fileRecord["content"];

        if (this._check_is(src, STR)) {
            body.value = this._replace_Parameters(src);
        } else if (this._check_isNot(content, UND, "Parameter 'content' of request body of type file")) {
            this._notSupported.add(NotSupported.FileContent);
        } else {
            this._log.warn(`Request object contains invalid file body value; no valid src or content properties. Body value: ${fileRecord}`);
        }

        return [body, null];
    }

    private _graphql_to_BodyHelper(input: unknown): [unknown, string] {
        let graphqlContent = input["graphql"];

        if (this._check_isNot(graphqlContent, OBJ, "Request body of type graphql")) {
            return [{
                type: HttpBodyType.Regular,
                value:"{\"query\": \"\"}",
                valueType: HttpBodyContentType.Text
            }, "application/json"];
        }

        let query = graphqlContent["query"];
        if (this._check_isNot(query, STR)) {
            query = "";
        }

        return [{
            type: HttpBodyType.Regular,
            value: `{"query": ${this._replace_Parameters(query)}}`,
            valueType: HttpBodyContentType.Text
        }, "application/json"];
    }
}

//#endregion
