/* eslint-disable @typescript-eslint/ban-types */

export enum HttpRequestMethod {
    GET     = "GET",
    POST    = "POST",
    PUT     = "PUT",
    DELETE  = "DELETE",
    HEAD    = "HEAD",
    CONNECT = "CONNECT",
    OPTIONS = "OPTIONS",
    TRACE   = "TRACE",
    PATCH   = "PATCH",
    NONE    = "NONE"
}

export interface HttpHeaderRecord {
    name: string;
    value: string;
}

export interface AutomaticHttpHeaderRecord {
    name: string;
    value: string;
    editable: boolean;
}

export enum HttpBodyContentType {
    Text = "Text", File = "File"
}

export class HttpFormRecord {
    name: string;
    value: string;
    type: HttpBodyContentType;
}

export enum HttpBodyType {
    Regular = "Regular", Form = "Form"
}

export abstract class HttpBody {
    type: HttpBodyType;

    static fromPlainObject(plainObject: Object): HttpBody {
        if (plainObject["type"] == HttpBodyType.Form)
            return new HttpFormBody(plainObject);
        else if (plainObject["type"] == HttpBodyType.Regular) {
            return new HttpTextBody(plainObject);
        }

        throw new Error(`Body type ${plainObject["type"]} not supported properly.`);
    }

    abstract toPlainObject(): Object;
    abstract clone(): HttpBody;
}

export enum FormEncoding {
    Multipart = "multipart/form-data",
    UrlEncoded = "application/x-www-form-urlencoded"
}

export class HttpFormBody extends HttpBody {
    encoding: FormEncoding = FormEncoding.Multipart;
    records: Array<HttpFormRecord> = [];

    constructor(plainObject: Object = null) {
        super();

        this.type = HttpBodyType.Form;

        if (plainObject == null) return;
        this.encoding = plainObject["encoding"];
        this.records = plainObject["records"];
    }

    toPlainObject(): Object {
        return {
            type: this.type,
            encoding: this.encoding,
            records: this.records
        };
    }

    clone(): HttpFormBody {
        let clone = new HttpFormBody();
        clone.encoding = this.encoding;
        clone.records = this.records.map(record => ({
            name: record.name,
            value: record.value,
            type: record.type
        }));
        return clone;
    }
}

export class HttpTextBody extends HttpBody {
    value: string;
    valueType: HttpBodyContentType;

    constructor(plainObject: Object = null) {
        super();

        this.type = HttpBodyType.Regular;

        if (plainObject == null) return;
        this.value = plainObject["value"];
        this.valueType = plainObject["valueType"];
    }

    toPlainObject(): Object {
        return {
            type: this.type,
            value: this.value,
            valueType: this.valueType
        };
    }

    clone(): HttpTextBody {
        let clone = new HttpTextBody();
        clone.value = this.value;
        clone.valueType = this.valueType;
        return clone;
    }
}

export class HttpRequest {
    method: HttpRequestMethod = HttpRequestMethod.GET;
    url: string = "";
    headers: Array<HttpHeaderRecord> = [];
    body: HttpBody = null;

    constructor(plainObject: Object = null) {
        if (plainObject == null) return;

        this.method = plainObject["method"];
        this.url = plainObject["url"];
        this.headers = plainObject["headers"];

        if (!plainObject["body"])
            this.body = null;
        else
            this.body = HttpBody.fromPlainObject(plainObject["body"]);
    }

    toPlainObject(): Object {
        return {
            method: this.method,
            url: this.url,
            headers: this.headers,
            body: this.body?.toPlainObject() ?? null
        };
    }
}
