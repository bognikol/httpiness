import * as process from "process";
import { execSync } from "child_process";

export enum Platform {
    Unknown, Win32, MacOS, Linux
}

export function currentPlatform(): Platform {
    if (process.platform == "darwin") return Platform.MacOS;
    else if (process.platform == "win32") return Platform.Win32;
    else if (process.platform == "linux") return Platform.Linux;
    return Platform.Unknown;
}

export function openFileInDefaultApp(file: string): boolean {
    try {
        let command = "";

        const platform = currentPlatform();

        if (platform == Platform.MacOS)
            command = `open ${file}`;
        else if (platform == Platform.Win32)
            command = `start ${file}`;
        else if (platform == Platform.Linux)
            command = `xdg-open ${file}`;
        else
            return false;

        execSync(command);

        return true;

    } catch (ex) {
        return false;
    }
}
