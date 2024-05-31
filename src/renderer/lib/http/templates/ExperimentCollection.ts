import { HttpReqt, HttpCollection } from ".";

const RequestPlainObjects = [
    {
        name: "GitHub Zen",
        rawRequest: {
            method: "GET",
            url: "https://api.github.com/zen",
            headers: []
        }
    },
    {
        name: "Loopback JSON",
        rawRequest: {
            method: "POST",
            url: "https://httpbin.org/anything/${ANY_ID}/sample?sort=${SORT}",
            headers: [
                { name: "Authorization", value: "Bearer ${AUTH_TOKEN}" },
                { name: "Content-Type", value: "application/json" }
            ],
            body: {
                type: "Regular",
                value: "{\n\"action\": \"query\",\n\"object_type\": \"${OBJ_TYPE}\"\n}",
                valueType: "Text"
            }
        }
    },
    {
        name: "Loopback URL-encoded",
        rawRequest: {
            method: "POST",
            url: "https://httpbin.org/anything/${ANY_ID}/sample?sort=${SORT}",
            headers: [
                { name: "Authorization", value: "Bearer ${AUTH_TOKEN}" },
                { name: "Content-Type", value: "application/x-www-form-urlencoded" }
            ],
            body: {
                type: "Form",
                encoding: "application/x-www-form-urlencoded",
                records: [
                    { name: "action", value: "query", type: "Text" },
                    { name: "object_type", value: "${OBJECT_TYPE}", type: "Text" }]
            }
        }
    }
];

const Macros = [
    { name: "ANY_ID", value: "ID123" },
    { name: "SORT", value: "desc" },
    { name: "AUTH_TOKEN", value: "Auth123" }
];

export function initExpCollection(collection: HttpCollection): void {
    RequestPlainObjects.forEach(obj => collection.addReqt(new HttpReqt().fromPlainObject(obj)));
    Macros.forEach(macro => collection.setMacro(macro.name, macro.value));
}
