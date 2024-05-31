/* eslint-disable @typescript-eslint/ban-types */
// Reqt is short from "REQuest Template"
import * as path from "path";


import { HttpDir, HttpUrl } from "..";
import { MacroedText } from "../Macro";
import { HttpBody, HttpBodyContentType, HttpBodyType, HttpFormBody, HttpHeaderRecord, HttpRequest, HttpRequestMethod, HttpTextBody } from "../HttpRequest";
import { HttpCollectionItem } from "./HttpCollectionItem";
import { HttpAuth } from "./HttpAuth";

export class HttpReqt extends HttpCollectionItem  {
    public eventMethodChanged  = "methodChanged";
    public eventUrlChanged     = "urlChanged";
    public eventHeadersChanged = "headersChanged";
    public eventBodyChanged    = "bodyChanged";
    public eventAuthChanged    = "authChanged";

    private _rawRequest: HttpRequest = new HttpRequest();

    private _defaultBody: HttpBody = null;

    private _auth: HttpAuth = null;
    private _authPath: string = null;

    private _urlMacros: Array<string> = [];
    private _headerMacros: Array<string> = [];
    private _bodyMacros: Array<string> = [];

    fromPlainObject(plainObject: Object): this {
        this._name = plainObject["name"];
        this._rawRequest = new HttpRequest(plainObject["rawRequest"]);

        if (plainObject["defaultBody"])
            this._defaultBody = HttpBody.fromPlainObject(plainObject["defaultBody"]);
        else
            this._defaultBody = this._rawRequest.body ? this._rawRequest.body.clone() : null;

        let auth = plainObject["auth"];

        if (auth) {
            if (typeof auth == "string") {
                this._authPath = auth;
            } else if (typeof auth == "object") {
                this._auth = new HttpAuth().fromPlainObject(auth).setName(null).setParent(this);
            }
        }

        this._enumerateUrlMacros();
        this._enumerateHeaderMacros();
        this._enumerateBodyMacros();

        return this;
    }

    toPlainObject(): Object {
        let plainObject = {
            name: this.getName(),
            rawRequest: this._rawRequest.toPlainObject(),
            defaultBody: this._defaultBody?.toPlainObject()
        };

        if (this._auth) {
            if (this._auth.getParent() instanceof HttpDir)
                plainObject["auth"] = this._auth.getFullPath();
            else
                plainObject["auth"] = this._auth.toPlainObject();
        }

        return plainObject;
    }

    setParent(parent: HttpDir): this {
        super.setParent(parent);
        return this;
    }

    getParent(): HttpDir {
        return <HttpDir> this._parent;
    }

    setMethod(method: HttpRequestMethod): this {
        if (this._rawRequest.method == method) return this;

        this._rawRequest.method = method;
        this.raise(this.eventMethodChanged);

        if (this._rawRequest.method != HttpRequestMethod.POST &&
            this._rawRequest.method != HttpRequestMethod.PUT)
            this._rawRequest.body = null;

        this._makeDirty();
        return this;
    }

    setUrl(url: string): this {
        if (this._rawRequest.url == url) return this;

        this._rawRequest.url = url;
        this._enumerateUrlMacros();
        this.raise(this.eventUrlChanged);
        this._makeDirty();
        return this;
    }

    setHeaders(headers: Array<HttpHeaderRecord>): this {
        this._rawRequest.headers = headers;
        this._enumerateHeaderMacros();
        this.raise(this.eventHeadersChanged);
        this._makeDirty();
        return this;
    }

    setBody(body: HttpBody): this {
        this._rawRequest.body = body;
        this._enumerateBodyMacros();
        this.raise(this.eventBodyChanged);
        this._makeDirty();
        return this;
    }

    saveCurrentBodyAsDefault(): this {
        let rawBody = this.getRawHttpRequest().body;

        if (rawBody)
            rawBody = rawBody.clone();

        this._defaultBody = rawBody;
        return this;
    }

    revertBodyToDefault(): this {
        let body = this._defaultBody;

        if (body) body = body.clone();

        this.setBody(body);
        return this;
    }

    setAuth(auth: HttpAuth): this {
        if (this._auth != null) {
            this._auth
                .off(this._auth.eventAboutToBeDeleted, this._onAuthAboutToBeDeleted)
                .off(this._auth.eventNameChanged, this._onAuthNameChanged);
        }

        if (this._auth == auth) return this;

        this._auth = auth;

        if (this._auth != null) {
            this._auth
                .on(this._auth.eventAboutToBeDeleted, this._onAuthAboutToBeDeleted)
                .on(this._auth.eventNameChanged, this._onAuthNameChanged);
        }

        if (this._auth && this._auth.getParent() instanceof HttpReqt)
            this._auth.setParent(this);

        this.raise(this.eventAuthChanged);
        this._makeDirty();
        return this;
    }

    getAuth(): HttpAuth {
        return this._auth;
    }

    getRawHttpRequest(): HttpRequest {
        return this._rawRequest;
    }

    async getHttpRequest(skipQueryItemsWithEmptyValue: boolean = true): Promise<HttpRequest> {
        const collection = this.getContainingCollection();

        let request = new HttpRequest();
        request.method = this._rawRequest.method;

        request.url = this._rawRequest.url;
        for (let macro of this._urlMacros) {
            request.url = request.url.replaceAll("${" + macro + "}", await collection.getMacroValue(macro));
        }

        if (skipQueryItemsWithEmptyValue)
            request.url = this._sanitizeUrlForEmptyQueryValues(request.url);

        request.headers = this._rawRequest.headers.map(header => ({ name: header.name, value: header.value }));

        for (let macro of this._headerMacros) {
            const macroValue = await collection.getMacroValue(macro);
            for (let header of request.headers) {
                header.name = header.name.replaceAll("${" + macro + "}", macroValue);
                header.value = header.value.replaceAll("${" + macro + "}", macroValue);
            }
        }

        if (this._rawRequest.body != null) {
            request.body = this._rawRequest.body.clone();
            if (request.body.type == HttpBodyType.Regular) {
                let body = <HttpTextBody>(request.body);
                let bodyValue = body.value;
                for (let macro of this._bodyMacros) {
                    bodyValue = bodyValue.replaceAll("${" + macro + "}", await collection.getMacroValue(macro));
                }

                if (body.valueType == HttpBodyContentType.File) {
                    if (!path.isAbsolute(bodyValue)) {
                        bodyValue = path.join(
                            path.dirname(this.getContainingCollection().getFilePath()), bodyValue
                        );
                    }
                }

                (<HttpTextBody>(request.body)).value = bodyValue;
            } else if (request.body.type == HttpBodyType.Form) {
                let formBody = <HttpFormBody>(request.body);
                formBody.records = [ ...formBody.records ];

                for (let macro of this._bodyMacros) {
                    const macroValue = await collection.getMacroValue(macro);
                    for (let record of formBody.records) {
                        record.name = record.name.replaceAll("${" + macro + "}", macroValue);
                        record.value = record.value.replaceAll("${" + macro + "}", macroValue);
                    }
                }

                for (let record of formBody.records) {
                    if (record.type == HttpBodyContentType.File) {
                        if (!path.isAbsolute(record.value)) {
                            record.value = path.join(
                                path.dirname(this.getContainingCollection().getFilePath()), record.value
                            );
                        }
                    }
                }

                formBody.records = formBody.records.filter(record => record.value);
            } else {
                throw new Error(`Unsupported HttpBodyType ${request.body.type}.`);
            }
        }

        let effectiveAuth = this._findEffectiveAuth();

        if (effectiveAuth)
            request = await effectiveAuth.modify(request);

        return request;
    }

    clone(): HttpReqt {
        let clone = new HttpReqt();

        clone.setName(this._name);
        clone.setMethod(this._rawRequest.method);
        clone.setUrl(this._rawRequest.url);
        clone.setHeaders(this._rawRequest.headers.map(header => ({ name: header.name, value: header.value })));
        clone.setBody(this._rawRequest.body != null ? this._rawRequest.body.clone() : null);

        if (this._auth && this._auth.getParent() == this) {
            clone.setAuth(this._auth.clone());
        } else {
            clone.setAuth(this._auth);
        }

        return clone;
    }

    getUrlMacroNames(): Array<string> {
        return this._urlMacros;
    }

    getHeaderMacroNames(): Array<string> {
        return this._headerMacros;
    }

    getBodyMacroNames(): Array<string> {
        return this._bodyMacros;
    }

    getAuthMacroNames(): Array<string> {
        let auth = this._findEffectiveAuth();
        if (!auth) return [];
        return auth.getMacroNames();
    }

    getMacroNames(): Array<string> {
        let macros: Array<string> = [];

        this._urlMacros.forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        this._headerMacros.forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        this._bodyMacros.forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        this.getAuthMacroNames().forEach(macro => {
            if (macros.indexOf(macro) == -1)
                macros.push(macro);
        });

        return macros;
    }

    _initSymLinks(): void {
        if (!this._authPath) return;
        let value = this.getContainingCollection().findFromAbsolutePath(this._authPath);
        if (!(value instanceof HttpAuth)) return;

        if (this._auth != null) {
            this._auth.off(this._auth.eventNameChanged, this._onAuthNameChanged);
        }

        this._auth = value;

        if (this._auth != null) {
            this._auth.on(this._auth.eventNameChanged, this._onAuthNameChanged);
        }
    }

    private _findEffectiveAuth(): HttpAuth {
        if (this._auth)
            return this._auth;

        let parent = this.getParent();

        while (parent != null) {
            let authIndex = parent.getAuths().findIndex(auth => auth.getName() == "Default Auth");
            if (authIndex != -1)
                return parent.getAuths()[authIndex];

            parent = parent.getParent();
        }

        return null;
    }

    private _onAuthNameChanged = (): void => {
        this.raise(this.eventAuthChanged);
    };

    private _onAuthAboutToBeDeleted = (): void => {
        this.setAuth(null);
    };

    private _enumerateUrlMacros(): void {
        this._urlMacros = MacroedText.parse(this._rawRequest.url).getMacroNames();
    }

    private _enumerateHeaderMacros(): void {
        this._headerMacros = [];

        this._rawRequest.headers.forEach(headerRecord => {
            MacroedText.parse(headerRecord.name)
                .getMacroNames()
                .forEach(macro => {
                    if (this._headerMacros.indexOf(macro) == -1)
                        this._headerMacros.push(macro);
                });

            MacroedText.parse(headerRecord.value)
                .getMacroNames()
                .forEach(macro => {
                    if (this._headerMacros.indexOf(macro) == -1)
                        this._headerMacros.push(macro);
                });
        });
    }

    private _enumerateBodyMacros(): void {
        this._bodyMacros = [];

        const body = this._rawRequest.body;
        if (!body) return;

        if (body.type == HttpBodyType.Regular) {
            MacroedText.parse((<HttpTextBody>body).value)
                .getMacroNames()
                .forEach(macro => {
                    if (this._bodyMacros.indexOf(macro) == -1)
                        this._bodyMacros.push(macro);
                });
        } else if (body.type == HttpBodyType.Form) {
            let formBody = <HttpFormBody>body;

            formBody.records.forEach(record => {
                MacroedText.parse(record.name)
                    .getMacroNames()
                    .forEach(macro => {
                        if (this._bodyMacros.indexOf(macro) == -1)
                            this._bodyMacros.push(macro);
                    });

                MacroedText.parse(record.value)
                    .getMacroNames()
                    .forEach(macro => {
                        if (this._bodyMacros.indexOf(macro) == -1)
                            this._bodyMacros.push(macro);
                    });
            });
        } else {
            throw new Error(`Unsupported HttpBodyType ${body.type}.`);
        }
    }

    private _sanitizeUrlForEmptyQueryValues(url: string): string {
        let pUrl = HttpUrl.parse(url);
        let query = pUrl.query;

        if (query.length <= 1) return url;
        let queryParts = query.slice(1).split("&");

        let validParts = [];
        for (let part of queryParts) {
            if (part.indexOf("=") == part.length - 1) {
                continue;
            }

            validParts.push(part);
        }

        if (validParts.length > 0)
            pUrl.query = "?" + validParts.join("&");
        else
            pUrl.query = "";

        return pUrl.toString();
    }
}
