import { FormEncoding, HttpBodyContentType, HttpBodyType, HttpFormBody,
    HttpRequest, HttpRequestMethod, HttpTextBody } from "../../http";


export class CurlCommandConverter {
    private static _myRegexp = /([^\s'"]([^\s'"]*(['"])([^\3]*?)\3)+[^\s'"]*)|[^\s'"]+|(['"])([^\5]*?)\5/gi;

    static convert(curlCommand: string): HttpRequest {
        try {
            let request = new HttpRequest();

            let argv = CurlCommandConverter._parseArgsStringToArgv(curlCommand);

            if (argv[0] != "curl") return null;

            let contentType: string = null;
            let explicitGet: boolean = false;
            let methodExplicitlySpecified: boolean = false;

            let index: number = 0;
            let command: string = "";

            // In the first scan extract headers, method and url:

            while (index < argv.length - 1) {

                index++;
                command = argv[index].trim();

                if (CurlCommandConverter._isValidUrl(command)) {
                    request.url = command;
                    continue;
                }

                if (command == "--url") {
                    index++;
                    let param = argv[index];

                    request.url = param;
                    continue;
                }

                if (command == "-X" || command == "--request") {
                    methodExplicitlySpecified = true;

                    index++;
                    let param = argv[index];

                    request.method = <HttpRequestMethod>param;
                    continue;
                }

                if (command == "-G" || command == "--get") {
                    methodExplicitlySpecified = true;
                    explicitGet = true;

                    request.method = HttpRequestMethod.GET;
                    continue;
                }

                if (command == "-I" || command == "--head") {
                    methodExplicitlySpecified = true;

                    request.method = HttpRequestMethod.HEAD;
                    continue;
                }

                if (command == "-H" || command == "--header") {
                    index++;
                    let param = argv[index];

                    let parts = param.split(":");
                    let name = parts[0].trim();
                    let value = parts.slice(1).join(":").trim();

                    if (name.toLowerCase().trim() == "content-type") {
                        contentType = value;
                    }

                    request.headers.push({ name, value });
                    continue;
                }
            }

            // In the second scan extract body:

            index = 0;
            command = "";

            while (index < argv.length - 1) {

                index++;
                command = argv[index];

                if (["-F", "--form", "--form-string"].includes(command)) {

                    if (!request.body || request.body.type != HttpBodyType.Form ||
                        (<HttpFormBody>request.body).encoding != FormEncoding.Multipart) {
                        request.body = new HttpFormBody();
                        (<HttpFormBody>request.body).encoding = FormEncoding.Multipart;
                    }

                    if (!methodExplicitlySpecified)
                        request.method = HttpRequestMethod.POST;

                    index++;
                    let param = argv[index];

                    let parts = param.split("=");
                    let name = parts[0].trim();
                    let value = parts.slice(1).join("=").trim();

                    let type = HttpBodyContentType.Text;
                    if (value.startsWith("@") && command != "--form-string") {
                        type = HttpBodyContentType.File;
                        value = value.substring(1);
                    }

                    (<HttpFormBody>(request.body)).records.push({ name, value, type });
                    continue;
                }

                if (["-d", "--data", "--data-ascii", "--data-raw",
                    "--data-binary", "--data-urlencode", "--json", "--url-query"].includes(command)) {

                    if (explicitGet || command == "--url-query") {

                        index++;
                        let param = argv[index];

                        let parts = param.split("=");
                        let name = parts[0].trim();
                        let value = parts.slice(1).join("=").trim();

                        let newUrl = new URL(request.url);
                        newUrl.searchParams.append(name, value);
                        request.url = newUrl.toString();

                    } else if (command != "--data-binary" && command != "--json" &&
                    (!contentType || contentType.includes("application/x-www-form-urlencoded"))) {

                        if (!methodExplicitlySpecified)
                            request.method = HttpRequestMethod.POST;

                        if (!request.body || request.body.type != HttpBodyType.Form ||
                            (<HttpFormBody>request.body).encoding != FormEncoding.UrlEncoded) {
                            request.body = new HttpFormBody();
                            (<HttpFormBody>request.body).encoding = FormEncoding.UrlEncoded;
                        }

                        index++;
                        let param = argv[index];

                        let parts = param.split("=");
                        let name = parts[0].trim();
                        let value = parts.slice(1).join("=").trim();

                        let type = HttpBodyContentType.Text;

                        (<HttpFormBody>(request.body)).records.push({ name, value, type });
                    } else {
                        if (!methodExplicitlySpecified)
                            request.method = HttpRequestMethod.POST;

                        if (!request.body || request.body.type != HttpBodyType.Regular) {
                            request.body = new HttpTextBody();
                        }

                        (<HttpTextBody>request.body).valueType = HttpBodyContentType.Text;

                        if (command == "--json") {
                            request.headers.push({ name: "Content-Type", value: "application/json" });
                            request.headers.push({ name: "Accept", value: "application/json" });
                        }

                        index++;
                        let param = argv[index];

                        let value = param;
                        let type = HttpBodyContentType.Text;

                        if (value.startsWith("@") && command != "--data-raw") {
                            type = HttpBodyContentType.File;
                            value = value.substring(1);
                        }

                        (<HttpTextBody>(request.body)).value = value;
                        (<HttpTextBody>(request.body)).valueType = type;
                    }
                }
            }

            return request;
        } catch (ex) {
            return null;
        }
    }

    private static _parseArgsStringToArgv(value: string): string[] {
        // ([^\s'"]([^\s'"]*(['"])([^\3]*?)\3)+[^\s'"]*) Matches nested quotes until the first space outside of quotes

        // [^\s'"]+ or Match if not a space ' or "

        // (['"])([^\5]*?)\5 or Match "quoted text" without quotes
        // `\3` and `\5` are a backreference to the quote style (' or ") captured
        let argv: Array<string> = [];
        let match: RegExpExecArray | null;
        do {
            // Each call to exec returns the next regex match as an array
            match = CurlCommandConverter._myRegexp.exec(value);

            if (match == null) break;

            // Index 1 in the array is the captured group if it exists
            // Index 0 is the matched text, which we use if no captured group exists

            let captures = [match[1], match[6], match[0]];

            for (let i = 0; i <= captures.length - 1; i++) {
                if (typeof captures[i] === "string") {
                    argv.push(captures[i]);
                    break;
                }
            }
            // eslint-disable-next-line no-constant-condition
        } while (true);

        return argv;
    }

    private static _isValidUrl(url: string): boolean {
        try {
            let parsedUrl = new URL(url);
            return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        } catch {
            return false;
        }
    }
}
