/* eslint-disable @typescript-eslint/ban-types */

import { HttpRequest } from "../../HttpRequest";
import { MacroedText } from "../../Macro";

import { HttpCollectionItem } from "../HttpCollectionItem";
import { HttpDir } from "../HttpDir";
import { HttpReqt } from "../HttpReqt";

import { AuthInserter, AuthLocation, AuthLocationType } from "./AuthInserter";
import { AuthDefinition, AuthType } from "./AuthDefinition";
import { AuthorizationValue, Authorizer } from "./Authorizer";


export interface IAsyncMiddleware<T> {
    modify(item: T): Promise<T>;
}

export class HttpAuth extends HttpCollectionItem implements IAsyncMiddleware<HttpRequest> {
    protected _authDef: AuthDefinition;
    protected _location: AuthLocation;
    protected _macroNames: Array<string> = [];

    protected _authValue: AuthorizationValue;

    fromPlainObject(plainObject: Object = null): this {
        if (plainObject == null) return this;

        if (plainObject["name"])
            this.setName(plainObject["name"]);

        this._authDef = plainObject["authDef"];
        this._location = plainObject["location"];
        this._enumerateMacroNames();

        return this;
    }

    setParent(parent: HttpDir | HttpReqt): this {
        super.setParent(parent);
        return this;
    }

    getParent(): HttpDir | HttpReqt {
        return <HttpDir> this._parent;
    }

    getMacroNames(): Array<string> {
        return this._macroNames;
    }

    async authorize(): Promise<string> {
        let result = await Authorizer.authorize(this._authDef, this.getContainingCollection());
        if (result.error)
            return result.error;

        this._authValue = result.value;
        return "";
    }

    async modify(request: HttpRequest): Promise<HttpRequest> {
        if (this._authDef.type != AuthType.OAuth2 || !this._authValue) {
            let error = await this.authorize();
            if (error) {
                console.log(`There was an error during authorization: ${error}`);
            }
        }
        return AuthInserter.insert(request, this._authValue, this._getEffectiveLocation());
    }

    toPlainObject(): Object {
        return {
            name: this.getName(),
            authDef: this._authDef,
            location: this._location
        };
    }

    setAuthDefinition(authDef: AuthDefinition): this {
        this._authDef = authDef;
        this._enumerateMacroNames();
        this._makeDirty();
        return this;
    }

    getAuthDefinition(): AuthDefinition {
        return this._authDef;
    }

    setAuthLocation(location: AuthLocation): this {
        this._location = location;
        this._enumerateMacroNames();
        this._makeDirty();
        return this;
    }

    getAuthLocation(): AuthLocation {
        return this._location;
    }

    clone(): HttpAuth {
        return new HttpAuth().setParent(this.getParent()).fromPlainObject(this.toPlainObject());
    }

    _initSymLinks(): void {
        return;
    }

    private _getEffectiveLocation(): AuthLocation {
        if (this._location)
            return this._location;

        let authType  = this._authDef.type;

        if (authType == AuthType.ApiKey) {
            return { type: AuthLocationType.Header, key: "Authorization", prefix: "" };
        }

        if (authType == AuthType.Basic) {
            return { type: AuthLocationType.Header, key: "Authorization", prefix: "Basic " };
        }

        return { type: AuthLocationType.Header, key: "Authorization", prefix: "Bearer " };
    }

    private _enumerateMacroNames(): void {
        let macroNames: Array<string> = [];

        const parsePlainObject = (obj: AuthDefinition | AuthLocation):void => {
            if (!obj) return;

            for (let key in obj) {
                let macroedText = MacroedText.parse(obj[key]);
                let names = macroedText.getMacroNames();
                names.forEach(name => {
                    if (macroNames.indexOf(name) == -1)
                        macroNames.push(name);
                });
            }
        };

        parsePlainObject(this._authDef);
        parsePlainObject(this._location);

        this._macroNames = macroNames;
    }
}
