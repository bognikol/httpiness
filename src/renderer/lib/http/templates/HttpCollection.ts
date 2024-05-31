import * as fs from "fs";
import * as path from "path";
import * as keytar from "keytar";
import * as uuid from "uuid";

import { IMacroContext, MacroPreset } from "../Macro";
import { FormEncoding } from "../HttpRequest";

import { HttpReqt } from "./HttpReqt";
import { HttpDir } from "./HttpDir";
import { HttpAuth } from "./HttpAuth";
import { initExpCollection } from "./ExperimentCollection";

declare const APP_ID: string;

export enum CollectionOpeningError { Success, UnsupportedVersion, UnknownVersion, UnknownError }

export interface CollectionOpeningResult {
    error: CollectionOpeningError;
    collection: HttpCollection;
}

class CollectionVersionUpdater {
    static from0Dot9To0Dot10(plainObject: any): any {

        let _updateDir = (dir: any): any => {
            dir["authChildren"] = [];
            if (dir["reqtChildren"]) {
                for (let i = 0; i <= dir["reqtChildren"].length - 1; i++) {
                    dir["reqtChildren"][i]["auth"] = null;
                }
            }
            if (dir["dirChildren"]) {
                for (let i = 0; i <= dir["dirChildren"].length - 1; i++) {
                    dir["dirChildren"][i] = _updateDir(dir["dirChildren"][i]);
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return dir;
        };

        plainObject["collectionVersion"] = "httpiness/JSON/0.10";
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return _updateDir(plainObject);
    }

    static from0Dot10To0Dot11(plainObject: any): any {
        let _updateDir = (dir: any): any => {
            if (dir["reqtChildren"]) {
                if (!Array.isArray(dir["reqtChildren"])) return;

                for (let i = 0; i <= dir["reqtChildren"].length - 1; i++) {
                    let request = dir["reqtChildren"][i].rawRequest;

                    if (!request) continue;
                    if (!request.body) continue;

                    if (request.body["type"] == "Form") {
                        request.body["encoding"] = FormEncoding.Multipart;
                    } else if (request.body["type"] == "Regular") {
                        try {
                            if (request.body["valueType"] != "Text") continue;
                            if (request.headers && Array.isArray(request.headers)) {
                                let header = request.headers.find(header =>
                                    header["name"].toUpperCase() == "CONTENT-TYPE" &&
                                    header["value"].toUpperCase() == "APPLICATION/X-WWW-FORM-URLENCODED"
                                );

                                if (!header) continue;
                                if (!request.body["value"]) continue;

                                let parsedUrlEncoded = request.body["value"].split("&");
                                request.body = {
                                    type: "Form",
                                    encoding: FormEncoding.UrlEncoded,
                                    records: []
                                };

                                for (let elem of parsedUrlEncoded) {
                                    let [ name, value ] = elem.split("=");

                                    if (!value) value = "";

                                    if (name) {
                                        request.body.records.push({
                                            type: "Text", name, value
                                        });
                                    }
                                }
                            }
                        } catch {
                            continue;
                        }
                    }
                }
            }

            if (dir["dirChildren"]) {
                for (let i = 0; i <= dir["dirChildren"].length - 1; i++) {
                    dir["dirChildren"][i] = _updateDir(dir["dirChildren"][i]);
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, consistent-return
            return dir;
        };

        plainObject["collectionVersion"] = "httpiness/JSON/0.11";

        return _updateDir(plainObject);
    }
}

/* eslint-disable @typescript-eslint/ban-types */
export class HttpCollection extends HttpDir implements IMacroContext {
    public static readonly localStorageExpCollectionPath = "local-storage-exp";
    private static readonly _defaultSensitiveValue = "******sensitive******";

    public eventMacroValueChanged = "macroValueChanged";

    private _pathToFile: string = "";
    private _lastSavedTimestamp: Date = null;
    private _dirty: boolean = false;

    private _macros: Record<string, string> = {};
    private _macroPresets: Array<MacroPreset> = [];
    private _uuid: string = "";

    private constructor() {
        super();

        this._uuid = <string>uuid.v4();
        this._macroPresets = [ { name: "Development", macros: [] }, { name: "Production", macros: [] } ];
    }

    public static fromFile(pathToFile: string): CollectionOpeningResult {
        try {
            let collection = new HttpCollection();

            collection._pathToFile = pathToFile;
            collection._name = HttpCollection._getCollectionName(pathToFile);
            collection._lastSavedTimestamp = HttpCollection._getLastModifiedFileTime(pathToFile);

            let content = HttpCollection._readContent(pathToFile);

            if (content == null) {
                collection.save();
                if (collection.isLocalExperimental())
                    initExpCollection(collection);
                return { error: CollectionOpeningError.Success, collection};
            }

            let parsedObject = JSON.parse(content);

            let version = parsedObject["collectionVersion"];

            if (typeof version != "string")
                return { error: CollectionOpeningError.UnknownVersion, collection: null};

            if (version == "httpiness/JSON/0.9") {
                parsedObject = CollectionVersionUpdater.from0Dot9To0Dot10(parsedObject);
                parsedObject = CollectionVersionUpdater.from0Dot10To0Dot11(parsedObject);
            } else if (version == "httpiness/JSON/0.10") {
                parsedObject = CollectionVersionUpdater.from0Dot10To0Dot11(parsedObject);
            } else if (version != "httpiness/JSON/0.11") {
                if (version.startsWith("httpiness/JSON/"))
                    return { error: CollectionOpeningError.UnsupportedVersion, collection: null};
                else
                    return { error: CollectionOpeningError.UnknownVersion, collection: null};
            }

            if (parsedObject["uuid"])
                collection._uuid = parsedObject["uuid"];

            collection._authChildren = [...parsedObject["authChildren"]].map(obj => new HttpAuth().setParent(collection).fromPlainObject(obj));
            collection._dirChildren = [...parsedObject["dirChildren"]].map(obj => new HttpDir().setParent(collection).fromPlainObject(obj));
            collection._reqtChildren = [...parsedObject["reqtChildren"]].map(obj => new HttpReqt().setParent(collection).fromPlainObject(obj));
            collection._macros = parsedObject["parameters"];

            if (parsedObject["parameterPresets"])
                collection._macroPresets = parsedObject["parameterPresets"];
            else
                collection._macroPresets = [ { name: "Development", macros: [] }, { name: "Production", macros: [] } ];

            collection._initSymLinks();

            return { error: CollectionOpeningError.Success, collection};
        } catch (ex) {
            console.log(ex);
            return { error: CollectionOpeningError.UnknownError, collection: null};
        }
    }

    static isValidPath(path: string): boolean {
        return path == HttpCollection.localStorageExpCollectionPath || fs.existsSync(path);
    }

    private static _readContent(pathToFile: string): string {
        if (pathToFile == HttpCollection.localStorageExpCollectionPath) {
            return localStorage.getItem(HttpCollection.localStorageExpCollectionPath);
        }

        if (!fs.existsSync(pathToFile)) return null;
        return fs.readFileSync(pathToFile, "utf-8");
    }

    private static _getCollectionName(pathToFile: string): string {
        if (pathToFile == HttpCollection.localStorageExpCollectionPath) {
            return "Experiment";
        }

        return path.parse(pathToFile).name;
    }

    private static _getLastModifiedFileTime(pathToFile: string): Date {
        if (pathToFile == HttpCollection.localStorageExpCollectionPath) {
            return null;
        }

        try {
            let stats = fs.statSync(pathToFile);
            if (stats) return stats.mtime;
            return null;
        } catch {
            return null;
        }
    }

    getUuid(): string {
        return this._uuid;
    }

    setName(name: string): this {
        throw new Error(`Collection name cannot be changed at all, including to ${name}.`);
    }

    getFilePath(): string {
        return this._pathToFile;
    }

    isLocalExperimental(): boolean {
        return this._pathToFile == HttpCollection.localStorageExpCollectionPath;
    }

    toPlainObject(): Object {
        let macrosRecs = {};
        this.getMacroNames().forEach(name => macrosRecs[name] = this._macros[name] ?? "" );
        return {
            collectionVersion: "httpiness/JSON/0.11",
            uuid: this._uuid,
            authChildren: this._authChildren.map(a => a.toPlainObject()),
            dirChildren:  this._dirChildren.map(d => d.toPlainObject()),
            reqtChildren: this._reqtChildren.map(r => r.toPlainObject()),
            parameters: macrosRecs,
            parameterPresets: this._macroPresets
        };
    }

    _makeDirty(): void {
        this._dirty = true;
    }

    isDirty(): boolean {
        return this._dirty;
    }

    save(): void {
        let plainObject = this.toPlainObject();

        if (this.isLocalExperimental()) {
            localStorage.setItem(this._pathToFile, JSON.stringify(plainObject));
        } else {
            fs.writeFileSync(this._pathToFile, JSON.stringify(plainObject, null, 2), "utf-8");
        }

        this._lastSavedTimestamp = HttpCollection._getLastModifiedFileTime(this._pathToFile);
        this._dirty = false;
    }

    isModifiedExternally(): boolean {
        if (this.isLocalExperimental()) false;
        let lastModifiedTime = HttpCollection._getLastModifiedFileTime(this._pathToFile);
        return this._lastSavedTimestamp != null && lastModifiedTime != null &&
               this._lastSavedTimestamp.getTime() != lastModifiedTime.getTime();
    }

    async setMacro(name: string, value: string = null, sensitive: boolean = false): Promise<void> {
        let raiseValueChangedEvent = true;

        if (value == null) {
            raiseValueChangedEvent = false;
            value = await this.getMacroValue(name);
        } else if (sensitive) {
            raiseValueChangedEvent = false;
        } else {
            if (value == await this.getMacroValue(name)) {
                raiseValueChangedEvent = false;
            }
        }

        if (sensitive) {
            this._macros[name] = HttpCollection._defaultSensitiveValue;
            if (value != null && value.length != 0)
                keytar.setPassword(APP_ID, this._keychainAccountName(name), value);
        } else {
            keytar.deletePassword(APP_ID, this._keychainAccountName(name));
            this._macros[name] = value;
        }

        if (raiseValueChangedEvent) {
            this.raise(this.eventMacroValueChanged, {
                macroName: name, macroValue: this._macros[name]
            });
        }

        this._makeDirty();
    }

    deleteMacro(name: string): this {
        keytar.deletePassword(APP_ID, this._keychainAccountName(name));
        delete this._macros[name];
        this._makeDirty();
        return this;
    }

    async getMacroValue(name: string): Promise<string> {
        let value = this.getMacroPublicValue(name);

        if (value == HttpCollection._defaultSensitiveValue) {
            value = await keytar.getPassword(APP_ID, this._keychainAccountName(name));
            if (value == null)
                value = "";
        }

        return value;
    }

    getMacroPublicValue(name: string): string {
        if (!(name in this._macros)) return "";
        return this._macros[name];
    }

    isMacroSensitive(name: string): boolean {
        return this._macros[name] == HttpCollection._defaultSensitiveValue;
    }

    isMacroEmpty(name: string): boolean {
        return this.getMacroPublicValue(name).length == 0;
    }

    getMacroPresets(): Array<MacroPreset> {
        return this._macroPresets.map(preset =>
            ({ name: preset.name, macros: preset.macros.map(macro => ({ ...macro })) })
        );
    }

    setMacroPresets(presets: Array<MacroPreset>): Promise<void> {
        this._macroPresets = presets.map(preset =>
            ({ name: preset.name, macros: preset.macros.map(macro => ({ ...macro })) })
        );

        this._makeDirty();

        return Promise.resolve();
    }

    applyMacroPreset(presetName: string): this {
        let existingPreset = this._macroPresets.find(p => p.name == presetName);

        if (!existingPreset) return this;

        existingPreset.macros.forEach(macro => {
            if (!macro.value) return;
            this.setMacro(macro.name, macro.value, this.isMacroSensitive(macro.name));
        });

        return this;
    }

    private _keychainAccountName(macroName: string): string {
        return macroName + "_" + this._uuid;
    }
}
