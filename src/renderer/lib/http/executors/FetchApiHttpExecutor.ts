import { HttpRequest, HttpHeaderRecord, HttpBodyType, HttpFormBody, HttpBodyContentType, HttpTextBody } from "../HttpRequest";
import { HttpResponseBody } from "../HttpResponse";
import { IHttpExecutor, HttpExecution, HttpVersion } from "./HttpExecutor";

import * as fs from "fs";

export class FetchApiHttpExecutor implements IHttpExecutor {
    async execute(request: HttpRequest): Promise<HttpExecution> {

        try {
            let headers = new Headers();
            request.headers.forEach(header => headers.append(header.name, header.value));

            const init: RequestInit = {
                method: request.method,
                headers,
                mode: "cors"
            };

            if (request.body != null) {
                if (request.body.type == HttpBodyType.Regular) {
                    let textBody: HttpTextBody = <HttpTextBody>(request.body);
                    if (textBody.valueType == HttpBodyContentType.Text) {
                        init["body"] = (<HttpTextBody>request.body).value;
                    } else {
                        init["body"] = fs.readFileSync(textBody.value, "utf-8");
                    }
                } else {
                    let formData = new FormData();
                    const formBody: HttpFormBody = <HttpFormBody>(request.body);
                    formBody.records.forEach(record => {
                        if (record.type == HttpBodyContentType.Text) {
                            formData.append(record.name, record.value);
                        } else {
                            formData.append(record.name, fs.readFileSync(record.value, "utf-8"));
                        }
                    });
                    init["body"] = formData;
                }
            }

            const startTimeStamp = Date.now();
            let fetchResponse = await fetch(request.url, init);
            const endTimeStamp = Date.now();

            let responseHeaders: Array<HttpHeaderRecord> = [];
            fetchResponse.headers.forEach((value, name) => responseHeaders.push({ name, value }));

            let parsedUrl = new URL(request.url);
            let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

            let body: HttpResponseBody = new HttpResponseBody(await fetchResponse.text(), responseHeaders, baseUrl);

            return {
                response: {
                    status: fetchResponse.status,
                    headers: responseHeaders,
                    body
                },
                metadata: {
                    timestamp: new Date(),
                    errorMessage: null,
                    executor: "fetch",
                    executorVersion: null,
                    httpVersion: HttpVersion.Unknown,
                    headerNumber: -1,
                    localIp: "",
                    localPort: "",
                    remoteIp: "",
                    remotePort: "",
                    effectiveUrl: "",
                    numberOfRedirects: -1,
                    redirectUrl: "",
                    executionTimeInSeconds: (endTimeStamp - startTimeStamp) / 1000.0,
                    downloadSizeInBytes: -1,
                    uploadSizeInBytes: -1,
                    speedDownload: -1,
                    speedUpload: -1
                }
            };
        } catch (ex) {
            return {
                response: null,
                metadata: {
                    timestamp: new Date(),
                    errorMessage: ex["message"] ? ex["message"] : "There was an error making Fetch API request.",
                    executor: "fetch",
                    executorVersion: null,
                    httpVersion: HttpVersion.Unknown,
                    headerNumber: -1,
                    localIp: "0",
                    localPort: "0",
                    remoteIp: "0",
                    remotePort: "0",
                    effectiveUrl: "",
                    numberOfRedirects: -1,
                    redirectUrl: "",
                    executionTimeInSeconds: -1,
                    downloadSizeInBytes: -1,
                    uploadSizeInBytes: -1,
                    speedDownload: -1,
                    speedUpload: -1
                }
            };
        }
    }
}
