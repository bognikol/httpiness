import * as os from "os";
import * as path from "path";
import * as fs from "fs";


class EnvironmentImpl {
    private readonly _configFile: string = path.join(os.homedir(), "httpiness.env");
    private _env: Record<string, string> = {};

    constructor() {
        try {
            let lines = fs.readFileSync(this._configFile, { encoding: "utf-8" }).split("\n");

            for (let line of lines) {
                line = line.trim();

                if (line.length >= 1 && line.charAt(0) == "#")
                    continue;

                let parts = line.split("=");

                if (parts.length == 2) {
                    this._env[parts[0].trim().toUpperCase()] = parts[1].trim().toUpperCase();
                } else if (parts.length == 1) {
                    this._env[parts[0].trim().toUpperCase()] = "";
                }
            }
        } catch {
            // Do nothing - this is best effort.
        }
    }

    isDefined(name: string): boolean {
        return name in this._env;
    }

    getValue(name: string): string {
        return this._env[name];
    }
}

export const Environment = new EnvironmentImpl();
