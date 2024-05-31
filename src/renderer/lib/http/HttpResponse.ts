import * as db from "mime-db";
import * as path from "path";
import * as fs from "fs";

import { TempManager } from "../TempManager";
import { HttpHeaderRecord } from "./HttpRequest";
import { MacroRecord } from "./Macro";

export class HttpContentType {
    private _value:      string = "unknown";
    private _type:       string = "unknown";
    private _parameters: Array<MacroRecord> = [];

    static parse(headers: Array<HttpHeaderRecord>): HttpContentType {
        const cntType = new HttpContentType();

        const contentTypeHeaders = headers.filter(record => record.name.toUpperCase().trim() == "CONTENT-TYPE");
        if (contentTypeHeaders.length == 0)
            return cntType;

        cntType._value = contentTypeHeaders[0].value;

        const sections = cntType._value.split(";");
        cntType._type = sections[0];

        for (let i = 1; i <= sections.length - 1; i++) {
            const [ name, value ] = sections[i].split("=");
            if (!name || !value) continue;
            cntType._parameters[name] = value;
        }

        return cntType;
    }

    getValue(): string {
        return this._value;
    }

    getType(): string {
        return this._type;
    }

    getBaseType(): string {
        return this._type.split("/")[0];
    }

    getSubtype(): string {
        let parts = this._type.split("/");
        if (parts.length == 1)
            return "unknown";
        return parts[1];
    }

    getParameters(): Array<MacroRecord> {
        return this._parameters;
    }

    getDefaultExtension(): string {
        let dbMimeRecord = db[this._type];

        if (dbMimeRecord &&
            dbMimeRecord["extensions"] &&
            dbMimeRecord["extensions"].length &&
            dbMimeRecord["extensions"].length >= 1)
            return String(dbMimeRecord["extensions"][0]);

        return "unknown";
    }

    getExtensions(): Array<string> {
        let dbMimeRecord = db[this._type];

        if (dbMimeRecord &&
            dbMimeRecord["extensions"] &&
            dbMimeRecord["extensions"].length &&
            dbMimeRecord["extensions"].length >= 0)
            return <Array<string>>dbMimeRecord["extensions"];

        return [];
    }
}

export class HttpResponseBody {
    private _content: string = null;
    private _baseUrl: string = "";
    private _contentType: HttpContentType = null;
    private _contentSize: number = 0;
    private _tempFile: string = null;

    constructor(data: string, headers: Array<HttpHeaderRecord>, baseUrl: string) {
        this._content = data;
        this._baseUrl = baseUrl;
        this._contentType = HttpContentType.parse(headers);
        this._contentSize = this._content.length;

        if (this._contentSize > 1024 * 1024) {
            this.getTempFile();
            this._content == null;
        }
    }

    /*private static _readContentLengthFromHeaders(headers: Array<HttpHeaderRecord>): number {
        const contentTypeHeaders = headers.filter(record => record.name.toUpperCase().trim() == "CONTENT-LENGTH");
        if (contentTypeHeaders.length == 0)
            return 0;

        try {
            return Number.parseInt(contentTypeHeaders[0].value);
        } catch (ex) {
            return 0;
        }
    }*/

    toString(encoding: "binary" | "utf-8" | "utf-16" = "binary"): string {
        return new TextDecoder(encoding).decode(Buffer.from(this.getContent(), "binary"));
    }

    getContent(): string {
        if (this._content != null)
            return this._content;

        return fs.readFileSync(this.getTempFile(), "binary");
    }

    getBaseUrl(): string {
        return this._baseUrl;
    }

    getContentType(): HttpContentType {
        return this._contentType;
    }

    getContentSize(): number {
        return this._contentSize;
    }

    getTempFile(): string {
        if (this._tempFile == null) {
            this._tempFile = TempManager.toTempFile(this._content, this._contentType.getDefaultExtension());
        }
        return this._tempFile;
    }

    getTempFilePosixStyle(): string {
        return this.getTempFile().split(path.sep).join(path.posix.sep);
    }

    toFile(path: string): void {
        fs.writeFileSync(path, this._content, "binary");
    }
}

export class HttpResponse {
    status: number;
    headers: Array<HttpHeaderRecord>;
    body: HttpResponseBody;
}
