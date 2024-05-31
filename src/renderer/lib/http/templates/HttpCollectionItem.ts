import { ISimpleEventable, SimpleEventBroker, SimpleEventListener } from "../../SimpleEvent";
import { IMacroSource } from "../Macro";

import { HttpCollection } from "./HttpCollection";

export abstract class HttpCollectionItem implements ISimpleEventable, IMacroSource {
    public eventNameChanged = "nameChanged";
    public eventAboutToBeDeleted = "aboutToBeDeleted";

    protected _name: string = "";
    protected _parent: HttpCollectionItem = null;

    private _eventBroker: SimpleEventBroker = new SimpleEventBroker(this);

    setName(name: string): this {
        if (this._name == name) return this;

        // TODO: We need to check if sibling with same name already exists

        this._name = name;
        this._makeDirty();
        this.raise(this.eventNameChanged);
        return this;
    }

    getName(): string {
        return this._name;
    }

    getFullPath(): string {
        let pathElements: Array<string> = [];

        let parent = <HttpCollectionItem> this;

        if (parent._parent == null) return "";

        while (parent._parent != null) {
            pathElements.push(parent.getName());
            parent = parent._parent;
        }

        return "/" + pathElements.reverse().join("/");
    }

    setParent(parent: HttpCollectionItem): this {
        if (this._parent == parent) return this;

        this._parent = parent;
        this._makeDirty();
        return this;
    }

    getParent(): HttpCollectionItem {
        return this._parent;
    }

    getContainingCollection(): HttpCollection {
        let parent = <HttpCollectionItem> this;

        while (parent._parent != null) {
            parent = parent._parent;
        }

        return <HttpCollection> parent;
    }

    on(eventName: string, handler: SimpleEventListener): this {
        this._eventBroker.on(eventName, handler);
        return this;
    }

    off(eventName: string, handler: SimpleEventListener): this {
        this._eventBroker.off(eventName, handler);
        return this;
    }

    raise(eventName: string, args: Record<string, unknown> = {}): void {
        this._eventBroker.raise(eventName, args);
    }

    protected _makeDirty(): void {
        if (this._parent != null)
            this._parent._makeDirty();
    }

    abstract getMacroNames(): Array<string>;
    abstract _initSymLinks(): void;
}
