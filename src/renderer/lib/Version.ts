declare const VERSION: string;

export class Version {
    public static readonly current: Version = Version.fromString(VERSION);

    private _major: number = 0;
    private _minor: number = 0;
    private _build: number = 0;

    public static fromString(version: string): Version {
        try {
            let v = new Version();

            let parts = version.trim().split(".");

            if (parts.length != 3) return v;

            v._major = Number.parseInt(parts[0]);
            v._minor = Number.parseInt(parts[1]);
            v._build = Number.parseInt(parts[2]);

            return v;
        } catch {
            return new Version();
        }
    }

    getMajor(): number {
        return this._major;
    }

    getMinor(): number {
        return this._minor;
    }

    getRevision(): number {
        return this._build;
    }

    isDefault(): boolean {
        return (this._major == 0 && this._minor == 0 && this._build == 0);
    }

    toString(includeRevision: boolean = false): string {
        if (includeRevision) {
            return `${this._major}.${this._minor}.${this._build}`;
        } else {
            return `${this._major}.${this._minor}`;
        }
    }

    newerThen(version: Version): boolean {
        if ((this._major >  version._major) ||
            (this._major == version._major && this._minor > version._minor)) return true;

        return false;
    }
}

console.log(Version.current.toString(true));
