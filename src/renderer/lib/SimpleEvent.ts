/* eslint-disable @typescript-eslint/ban-types */
export class SimpleEvent {
    sender: Object;
    detail: Record<string, unknown>;
}

export type SimpleEventListener = (e: SimpleEvent) => void;

export interface ISimpleEventable {
    on(eventName: string, handler: SimpleEventListener): this;
    off(eventName: string, handler: SimpleEventListener): this;
    raise(eventName: string, args: Record<string, unknown>): void;
}

export class SimpleEventBroker implements ISimpleEventable {
    private _owner: Object;
    private _eventDirectory: Record<string, SimpleEventListener[]> = {};

    constructor(owner: Object) {
        this._owner = owner;
    }

    on(eventName: string, handler: SimpleEventListener): this {
        if (!this._eventDirectory.hasOwnProperty(eventName))
            this._eventDirectory[eventName] = [];

        if (this._eventDirectory[eventName].find(h => h == handler) != undefined) return this;

        this._eventDirectory[eventName].push(handler);
        return this;
    }

    off(eventName: string, handler: SimpleEventListener): this {
        if (!this._eventDirectory.hasOwnProperty(eventName)) return this;
        this._eventDirectory[eventName] = this._eventDirectory[eventName].filter(h => h != handler);
        return this;
    }

    raise(eventName: string, args: Record<string, unknown>): void {
        if (!this._eventDirectory.hasOwnProperty(eventName)) return;

        let e = new SimpleEvent();
        e.sender = this._owner;
        e.detail = args;

        this._eventDirectory[eventName].forEach(h => h(e));
    }
}
