import { HttpBodyContentType, HttpBodyType, HttpFormBody, HttpReqt,
    HttpCollection, HttpRequest, HttpRequestMethod, HttpTextBody } from "../../src/renderer/lib/http";

type RequestDef = [HttpRequestMethod, string, Array<[string, string]>, [HttpBodyType, Array<[HttpBodyContentType, string, string]>]];
type MacroDef = Array<[string, string]>;

function toHttpRequest(def: RequestDef): HttpRequest {
    let request: HttpRequest = new HttpRequest();

    request.method = def[0];
    request.url = def[1];
    def[2].forEach(header => request.headers.push({ name: header[0], value: header[1] }));

    if (def[3][0] == null) return request;

    if (def[3][0] == HttpBodyType.Regular) {
        request.body = new HttpTextBody();
        (<HttpTextBody>(request.body)).valueType = def[3][1][0][0];
        (<HttpTextBody>(request.body)).value = def[3][1][0][2];

    } else if (def[3][0] == HttpBodyType.Form) {
        request.body = new HttpFormBody();
        def[3][1].forEach(record => {
            (<HttpFormBody>request.body).records.push({ type: record[0], name: record[1], value: record[2] });
        });
    }

    return request;
}

const GET = HttpRequestMethod.GET;
const POST = HttpRequestMethod.POST;
const PATCH = HttpRequestMethod.PATCH;

const Regular = HttpBodyType.Regular;
const Form = HttpBodyType.Form;

const File = HttpBodyContentType.File;
const Text = HttpBodyContentType.Text;

function testMacroResolution(testName: string, rawRequest: RequestDef, context: MacroDef, expectedRequest: RequestDef): void {
    test(testName, async () => {
        const inputRequest = toHttpRequest(rawRequest);
        const outputRequest = toHttpRequest(expectedRequest);

        let reqt = new HttpReqt();
        reqt.setMethod(inputRequest.method);
        reqt.setUrl(inputRequest.url);
        reqt.setHeaders(inputRequest.headers);
        reqt.setBody(inputRequest.body);

        let collectionResult = HttpCollection.fromFile("./dummyCollection.json");

        for (let pair of context) {
            await collectionResult.collection.setMacro(pair[0], pair[1]);
        }

        collectionResult.collection.addReqt(reqt);

        let actualOutput = await reqt.getHttpRequest();

        expect(actualOutput).toEqual(outputRequest);
    });
}


testMacroResolution("Sanity check",
    [ GET, "https://www.someurl.com", [["Content-Length", "222"], ["Content-Type", "application/json"]],
        [ Regular, [[Text, "name", "value"]] ]
    ],
    [],
    [ GET, "https://www.someurl.com", [["Content-Length", "222"], ["Content-Type", "application/json"]],
        [ Regular, [[Text, "name", "value"]] ]
    ]
);

testMacroResolution("Macros are properly replaces when body type is Text",
    [ PATCH, "${PROTOCOL}://${BASE_URL}${SUFFIX}/${SOME_PATH}",
        [["Authorization", "Bearer ${AUTH_TOKEN}"], ["Content-Type", "application/json/${PROTOCOL}"]],
        [ Regular, [[Text, "name", "This is some ${VALUE} isn't it?! Here's ${VALUE} again!"]]]
    ],
    [
        ["PROTOCOL", "https"],
        ["BASE_URL", "www.someurl"],
        ["SUFFIX", ".com"],
        ["SOME_PATH", "some_path"],
        ["VALUE", "value"],
        ["AUTH_TOKEN", "some_token"]
    ],
    [ PATCH, "https://www.someurl.com/some_path",
        [["Authorization", "Bearer some_token"], ["Content-Type", "application/json/https"]],
        [ Regular, [[Text, "name", "This is some value isn't it?! Here's value again!"]]]
    ]
);

testMacroResolution("Macros are properly replaces when body type is Form",
    [ POST, "${PROTOCOL}://${BASE_URL}${SUFFIX}/${SOME_PATH}",
        [["Authorization", "Bearer ${AUTH_TOKEN}"], ["Content-Type", "application/json/${PROTOCOL}"]],
        [ Form, [[Text, "name", "This is some ${VALUE} isn't it?! Here's ${VALUE} again!"], [File, "${VALUE}", "This is some ${AUTH_TOKEN} isn't it?! Here's ${VALUE} again!"]] ]
    ],
    [
        ["PROTOCOL", "https"],
        ["BASE_URL", "www.someurl"],
        ["SUFFIX", ".com"],
        ["SOME_PATH", "some_path"],
        ["VALUE", "value"],
        ["AUTH_TOKEN", "some_token"]
    ],
    [ POST, "https://www.someurl.com/some_path",
        [["Authorization", "Bearer some_token"], ["Content-Type", "application/json/https"]],
        [ Form, [[Text, "name", "This is some value isn't it?! Here's value again!"], [File, "value", "This is some some_token isn't it?! Here's value again!"]] ]
    ]
);
