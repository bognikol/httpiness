/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/naming-convention */

import { HttpBodyContentType, HttpRequest, HttpTextBody } from "../../HttpRequest";
import { AuthorizationValue } from "./Authorizer";

export enum AuthLocationType {
    Header         = "Header",
    UrlQuery       = "UrlQuery",
    UrlEncodedBody = "UrlEncodedBody"
}

export interface AuthLocation {
    type: AuthLocationType;
    key: string;
    prefix: string;
}

export class AuthInserter {
    public static insert(req: HttpRequest, value: AuthorizationValue, loc: AuthLocation): HttpRequest {
        switch (loc.type) {
            case AuthLocationType.UrlEncodedBody: return AuthInserter._urlEncodedBody_insert(req, value);
            case AuthLocationType.UrlQuery: return AuthInserter._urlQuery_insert(req, value, loc);
            default: return AuthInserter._header_insert(req, value, loc);
        }
    }

    private static _header_insert(req: HttpRequest, value: AuthorizationValue, loc: AuthLocation): HttpRequest {
        if (!value) return req;

        let stringValue: string = null;
        if (typeof value == "string") {
            stringValue = value;
        } else if (typeof value == "object") {
            stringValue = Object.keys(value).map(key => `${key}=${value[key]}`).join(",");
        }

        if (stringValue == null) return req;

        let authHeader = req.headers.find(record => record.name.trim().toLowerCase() == loc.key.toLowerCase());
        if (authHeader) {
            authHeader.name = loc.key;
            authHeader.value = `${loc.prefix.trim()} ${stringValue}`;
        } else {
            req.headers.push({
                name: loc.key,
                value: `${loc.prefix.trim()} ${stringValue}`
            });
        }

        return req;
    }

    private static _urlQuery_insert(req: HttpRequest, value: AuthorizationValue, loc: AuthLocation): HttpRequest {
        if (!value) return req;

        let stringValue = null;
        if (typeof value == "string") {
            stringValue = value;
        } else if (typeof value == "object") {
            throw new Error("AuthorizationValue of type object cannot be inserted to URL");
        }

        if (stringValue == null) return req;

        let url = new URL(req.url);
        url.searchParams.set(loc.key, `${loc.prefix}${value}`);
        req.url = url.toString();
        return req;
    }

    private static _urlEncodedBody_insert(req: HttpRequest, value: AuthorizationValue): HttpRequest {
        if (!value) return req;

        let stringValue = null;
        if (typeof value == "string") {
            stringValue = value;
        } else if (typeof value == "object") {
            stringValue = Object.keys(value).map(key => `${key}=${value[key]}`).join("&");
        }

        if (stringValue == null) return req;

        let authHeader = req.headers.find(record => record.name.trim().toLowerCase() == "content-type");
        if (authHeader) {
            authHeader.value = "application/x-www-form-urlencoded";
        } else {
            req.headers.push({
                name: "Content-Type",
                value: "application/x-www-form-urlencoded"
            });
        }

        let body = new HttpTextBody();
        body.valueType = HttpBodyContentType.Text;
        body.value = stringValue;
        req.body = body;

        return req;
    }
}
