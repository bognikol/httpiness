export class HttpUrlQuery extends Array<string> {
    public static parse(stringQuery: string): Array<string> {
        if (stringQuery.length == 0)
            return [];

        if (stringQuery.charAt(0) != "?")
            return [ stringQuery ];

        return stringQuery.substring(1).split("&").map((keyValuePair, index) => {
            if (index == 0)
                return "?" + keyValuePair;

            return "&" + keyValuePair;
        });
    }
}

export class HttpUrl {
    public protocol: string = "";
    public hostname: string = "";
    public path:     string = "";
    public query:    string = "";
    public hash:     string = "";

    public static parse(stringUrl: string): HttpUrl {

        let parsedUrl: HttpUrl = new HttpUrl();

        let protocolEnd = stringUrl.indexOf("://");
        let leftOver = stringUrl;

        if (protocolEnd != -1) {
            parsedUrl.protocol = stringUrl.substring(0, protocolEnd + 3);
            leftOver = leftOver.substring(protocolEnd + 3);
        }

        let currentToken: keyof HttpUrl = "hostname";

        for (let i = 0; i <= leftOver.length - 1; i++) {
            const currentChar = leftOver.charAt(i);

            if (currentChar == "/" && parsedUrl.path == "" &&
                parsedUrl.query == "" && parsedUrl.hash == "") {
                currentToken = "path";
                parsedUrl.path = parsedUrl.path + "/";
            } else if (currentChar == "?" && parsedUrl.query == "" && parsedUrl.hash == "") {
                currentToken = "query";
                parsedUrl.query = parsedUrl.query + "?";
            } else if (currentChar == "#" && parsedUrl.hash == "") {
                currentToken = "hash";
                parsedUrl.hash = parsedUrl.hash + "#";
            } else {
                parsedUrl[currentToken] = parsedUrl[currentToken] + currentChar;
            }
        }

        //if (protocolEnd != -1)
        //    parsedUrl.hostname = "//" + parsedUrl.hostname;

        return parsedUrl;
    }

    public toString(): string {
        return this.protocol + this.hostname + this.path + this.query + this.hash;
    }
}
