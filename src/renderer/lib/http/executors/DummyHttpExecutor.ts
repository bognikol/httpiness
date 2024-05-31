import { HttpResponseBody } from "../HttpResponse";
import { IHttpExecutor, HttpExecution } from "./HttpExecutor";

function delay(ms): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class DummyHttpExecutor implements IHttpExecutor {
    async execute(): Promise<HttpExecution> {

        await delay(2000);

        const status = 404;
        const headers = [{ name: "Content-Type", value: "application/json" }];
        const body = new HttpResponseBody("SomeText", headers, "");

        return {
            response: { status, headers, body },
            metadata: null
        };
    }
}
