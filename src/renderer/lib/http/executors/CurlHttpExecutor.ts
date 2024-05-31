import { execFile } from "child_process";
import * as process from "process";
import * as path from "path";
import * as fs from "fs";

import * as log from "../../Logger";
import { currentPlatform, Platform } from "../../Platform";
import { TempManager } from "../../TempManager";

import { HttpRequest, HttpBodyType, HttpFormBody, HttpBodyContentType, HttpTextBody, FormEncoding } from "../HttpRequest";
import { HttpResponse, HttpResponseBody } from "../HttpResponse";

import { IHttpExecutor, HttpExecution, HttpExecutionMetadata } from "./HttpExecutor";

declare let DIST: boolean;
declare let VERSION: boolean;

async function getCurlLocation(): Promise<string> {
    let basePath = path.join(process.cwd(), "dist/electron-workspace");
    if (DIST)
        basePath = path.join(process.resourcesPath, "app.asar");

    let osDir = "";
    let exeName = "";

    const platform = currentPlatform();
    if (platform == Platform.Win32) {
        osDir = "win32";
        exeName = "curl.exe";
    } else if (platform == Platform.MacOS) {
        osDir = "macOS";
        exeName = "curl";
    } else {
        throw new Error(`Platform ${platform} not supported.`);
    }

    let location = path.join(basePath, "resources", "bin", osDir, "curl", exeName);

    if (await testCurl(location)) return location;
    return "curl";
}

async function testCurl(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        try {
            execFile(path, ["-V"],
                (error, stdout) => {
                    if (error && !stdout) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                }
            );
        } catch (e: any) {
            resolve(false);
        }
    });
}

let curlLocation;
(async (): Promise<string> => curlLocation = await getCurlLocation())();

export class CurlHttpExecutorConfiguration {
    timeoutInSeconds: number = 30;
}

export class CurlHttpExecutor implements IHttpExecutor {
    public static autoHeaderValuePlaceholder: string = "<auto-calculated>";
    public static responseBufferMaxSize = 20 * 1024 * 1024;

    private static _metadataDelimiter: string = "\r\n---METADATA---RandomIdentifier:6iOlEfOLcO3AuadaODxT\r\n";

    private static _parseCurlResponse(responseOutput: string): HttpExecution {
        let chunks = responseOutput.split(CurlHttpExecutor._metadataDelimiter);

        const responseChunk = chunks[0];
        const metaChunk     = chunks[1];

        let metadata = new HttpExecutionMetadata();
        metadata.executor = "curl";

        let metadataRawObject = null;

        if (metaChunk) {
            try {
                metadataRawObject = JSON.parse(metaChunk.replace(/:0*\.?0*,/g, ":0,"));
            } catch (ex) {
                if (ex instanceof Error)
                    log.error(`Error parsing curl metadata JSON: ${ex.message}`, { error: ex });
            }

            if (metadataRawObject) {
                metadata.executorVersion        = metadataRawObject["curl_version"];
                metadata.errorMessage           = metadataRawObject["errormsg"];
                metadata.httpVersion            = metadataRawObject["http_version"];
                metadata.headerNumber           = metadataRawObject["num_headers"];
                metadata.localIp                = metadataRawObject["local_ip"];
                metadata.localPort              = metadataRawObject["local_port"];
                metadata.remoteIp               = metadataRawObject["remote_ip"];
                metadata.remotePort             = metadataRawObject["remote_port"];
                metadata.effectiveUrl           = metadataRawObject["url_effective"];
                metadata.redirectUrl            = metadataRawObject["redirect_url"];
                metadata.numberOfRedirects      = metadataRawObject["num_redirects"];
                metadata.executionTimeInSeconds = metadataRawObject["time_total"];
                metadata.downloadSizeInBytes    = metadataRawObject["size_download"];
                metadata.uploadSizeInBytes      = metadataRawObject["size_upload"];
                metadata.speedDownload          = metadataRawObject["speed_download"];
                metadata.speedUpload            = metadataRawObject["speed_upload"];

                if (metadata.errorMessage != null)
                    return { response: null, metadata };
            }
        } else {
            metadata.errorMessage = "Metadata is missing";
        }

        let httpResponseParts = responseChunk.split("\r\n\r\n");

        let headersAndStatus = httpResponseParts[0];

        const headersAndStatusChunks = headersAndStatus.split("\r\n");
        const status = parseInt(headersAndStatusChunks[0].split(" ")[1]);

        let headers = headersAndStatusChunks.slice(1);

        let response = new HttpResponse();

        response.status = status;
        response.headers = headers.map(row => {
            let parts = row.split(":");
            return {
                name: parts[0].trim(),
                value: parts.slice(1).join(":").trim()
            };
        });

        let parsedUrl = new URL(metadata.effectiveUrl);
        let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

        let body: HttpResponseBody = null;
        if (httpResponseParts.length != 1)
            body = new HttpResponseBody(httpResponseParts.slice(1).join("\r\n\r\n"), response.headers, baseUrl);

        response.body = body;

        return { response, metadata };
    }

    private static _buildCurlCmdArgs(request: HttpRequest): Array<string> {
        let cmdArgs: Array<string> = [
            "-q", "-k", "-g", "-w", "\r\n---METADATA---RandomIdentifier:6iOlEfOLcO3AuadaODxT\r\n%{json}", "-i", "-X", request.method, "--url", request.url
        ];

        const userAgentHeader = request.headers.filter(header => header.name.toUpperCase().trim() == "USER-AGENT");

        if (userAgentHeader.length == 0) {
            request.headers.push({
                name: "User-Agent",
                value: `httpiness/${VERSION}`
            });
        }

        request.headers.forEach(header => {
            cmdArgs.push("-H");
            cmdArgs.push(`${header.name}:${header.value}`);
        });

        if (!request.body) return cmdArgs;

        if (request.body.type == HttpBodyType.Form) {
            cmdArgs.push("-H");
            cmdArgs.push("Expect:");
            let formBody = <HttpFormBody>request.body;
            if (formBody.encoding == FormEncoding.Multipart) {
                formBody.records.forEach(record => {
                    if (record.type == HttpBodyContentType.Text) {
                        cmdArgs.push("--form-string");
                        cmdArgs.push(`${record.name}=${record.value}`);
                    } else if (record.type == HttpBodyContentType.File) {
                        if (!fs.existsSync(record.value))
                            throw new Error(`File ${record.value} does not exist.`);

                        cmdArgs.push("-F");
                        cmdArgs.push(`${record.name}=@${record.value}`);
                    } else {
                        throw new Error(`Request body content type ${record.type} is not supported.`);
                    }
                });
            } else if (formBody.encoding == FormEncoding.UrlEncoded) {
                formBody.records.forEach(record => {
                    if (!record.value) return;
                    if (record.type == HttpBodyContentType.Text) {
                        cmdArgs.push("--data-urlencode");
                        cmdArgs.push(`${record.name}=${record.value}`);
                    } else if (record.type == HttpBodyContentType.File) {
                        if (!fs.existsSync(record.value))
                            throw new Error(`File ${record.value} does not exist.`);

                        cmdArgs.push("--data-urlencode");
                        cmdArgs.push(`${record.name}=${fs.readFileSync(record.value)}`);
                    } else {
                        throw new Error(`Request body content type ${record.type} is not supported.`);
                    }
                });
            } else {
                throw new Error(`Request body form encoding ${formBody.encoding} is not supported.`);
            }

        } else if (request.body.type == HttpBodyType.Regular) {
            let regularBody = <HttpTextBody>request.body;
            if (regularBody.valueType == HttpBodyContentType.Text) {
                if (regularBody.value.length > 10 * 1024) {
                    let file = TempManager.toTempFile(regularBody.value, "txt");
                    cmdArgs.push("--data-binary");
                    cmdArgs.push(`@${file}`);
                    cmdArgs.push("-H");
                    cmdArgs.push("Expect:");
                } else {
                    let contentTypeHeader = request.headers.filter(header => header.name.toUpperCase().trim() == "CONTENT-TYPE");

                    if (contentTypeHeader.length == 0) {
                        cmdArgs.push("-H");
                        cmdArgs.push("Content-Type:text/plain");
                    }

                    cmdArgs.push("--data-raw");
                    cmdArgs.push(regularBody.value);
                }
            } else if (regularBody.valueType == HttpBodyContentType.File) {
                if (!fs.existsSync(regularBody.value))
                    throw new Error(`File ${regularBody.value} does not exist.`);
                cmdArgs.push("--data-binary");
                cmdArgs.push(`@${regularBody.value}`);
                cmdArgs.push("-H");
                cmdArgs.push("Expect:");
            } else {
                throw new Error(`Request body content type ${regularBody.type} is not supported.`);
            }
        } else {
            throw new Error(`Request body type ${request.body.type} is not supported.`);
        }

        return cmdArgs;
    }

    execute(request: HttpRequest): Promise<HttpExecution> {
        return new Promise<HttpExecution>((resolve) => {
            try {
                execFile(curlLocation, CurlHttpExecutor._buildCurlCmdArgs(request),
                    {
                        encoding: "binary",
                        maxBuffer: CurlHttpExecutor.responseBufferMaxSize
                    },
                    (error, stdout) => {
                        if (error && !stdout) {
                            log.error(`CurlHttpExecutor reported following error: ${error}`);
                            let metadata = new HttpExecutionMetadata();
                            metadata.executor = "curl";
                            metadata.errorMessage = "There was internal error while sending request.";

                            resolve({ metadata, response: null });
                            return;
                        }
                        resolve(CurlHttpExecutor._parseCurlResponse(stdout));
                    });
            } catch (e: any) {
                let metadata = new HttpExecutionMetadata();
                metadata.executor = "curl";

                if (e instanceof Error) {
                    metadata.errorMessage = (<Error>e).message;
                    log.error(`Exception happened while sending request: ${e.message}`, { error: e });
                } else {
                    metadata.errorMessage = "Unknown error happened.";
                    log.error("Unknown exception happened while sending request.", { error: e });
                }

                resolve({ response: null, metadata });
            }
        });
    }
}
