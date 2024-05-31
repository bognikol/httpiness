import { HttpRequest } from "../HttpRequest";
import { HttpResponse } from "../HttpResponse";

export enum HttpVersion {
    Unknown = "Unknown",
    Http1Dot0 = "1.0",
    Http1Dot1 = "1.1",
    Http2Dot0 = "2.0"
}

export class HttpExecutionMetadata {
    timestamp: Date = new Date();
    errorMessage: string;
    executor: "dummy" | "fetch" | "curl";
    executorVersion: string;
    httpVersion: HttpVersion;
    headerNumber: number;
    localIp: string;
    localPort: string;
    remoteIp: string;
    remotePort: string;
    effectiveUrl: string;
    numberOfRedirects: number;
    redirectUrl: string;
    executionTimeInSeconds: number;
    downloadSizeInBytes: number;
    uploadSizeInBytes: number;
    speedDownload: number;
    speedUpload: number;
}

export class HttpExecution {
    response: HttpResponse;
    metadata: HttpExecutionMetadata;
}

export interface IHttpExecutor {
    execute(request: HttpRequest): Promise<HttpExecution> ;
}
