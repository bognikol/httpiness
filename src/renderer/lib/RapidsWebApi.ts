import { Version } from "./Version";
import { Environment } from "./Environment";

class RapidsWebApiImpl {
    private _baseUrl: string = "";

    constructor(baseUrl: string = "https://api.httpiness.com") {
        this._baseUrl = baseUrl;
    }

    async getLatestVersion(): Promise<Version> {
        if (Environment.isDefined("DO_NOT_SEND_TELEMETRY")) return Version.current;

        const myHeaders = new Headers();
        myHeaders.append("pragma", "no-cache");
        myHeaders.append("cache-control", "no-cache");

        const config = {
            method: "GET",
            headers: myHeaders
        };

        let result = await fetch(`${this._baseUrl}/latest`, config);
        if (!result.ok)
            return new Version();

        return Version.fromString(await result.text());
    }

    async reportHeartBeat(): Promise<boolean> {
        let result = await fetch(`${this._baseUrl}/report/hb`);
        return result.ok;
    }
}

export const RapidsWebApi = new RapidsWebApiImpl();
