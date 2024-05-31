import { CurlHttpExecutor } from "./CurlHttpExecutor";
import { IHttpExecutor } from "./HttpExecutor";

export {
    IHttpExecutor, HttpExecution, HttpExecutionMetadata, HttpVersion
} from "./HttpExecutor";

export const HttpExecutor: IHttpExecutor = new CurlHttpExecutor();
