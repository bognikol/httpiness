import * as path from "path";
import * as os from "os";
import * as fs from "fs";

declare const APP_ID: string;

class HttpinessTempManager {
    private readonly _directory = path.join(os.tmpdir(), APP_ID);
    private readonly _directoryResponses = path.join(this._directory, "responses");

    toTempFile(content: string, extension: string): string {
        if (!fs.existsSync(this._directoryResponses)) {
            fs.mkdirSync(this._directoryResponses, { recursive: true });
        }

        let fileName = path.join(
            this._directoryResponses,
            this._generateTempFileName() + "." + extension
        );

        fs.writeFileSync(fileName, content, "binary");

        return fileName;
    }

    trashTemp(): boolean {
        throw new Error("Not implemented");
    }

    private _generateTempFileName(): string {
        const length = 10;

        let result: Array<string> = [];
        let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++ ) {
            result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
        }
        return result.join("");
    }
}

export const TempManager = new HttpinessTempManager();
