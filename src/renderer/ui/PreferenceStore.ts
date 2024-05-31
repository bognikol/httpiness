import { ISimpleEventable, SimpleEventListener, SimpleEventBroker } from "../lib/SimpleEvent";

import { ColorTheme } from "./StyleConstants";

export enum ResponseControlLocation {
    Console = "Console", Workspace = "Workspace", Automatic = "Automatic"
}

class HttpinessPreferences implements ISimpleEventable {
    public eventHideRequestDescriptorChanged    = "hideRequestLabelsChanged";
    public eventHideResponseDescriptorChanged   = "hideResponseLabelsChanged";
    public eventPreferSingleLineUrlChanged      = "preferSingleLineUrlChanged";
    public eventCloseConsoleOnMouseLeaveChanged = "closeConsoleOnMouseLeaveChanged";
    public eventColorThemeChanged               = "colorThemeChanged";
    public eventResponseLocationChanged         = "responseLocationChanged";
    public eventAutoHideParametersChanged       = "autoHideParametersChanged";

    private _eventBroker: SimpleEventBroker = new SimpleEventBroker(this);

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

    setHideRequestDescriptor(hide: boolean): this {
        if (hide == this.getHideRequestDescriptor()) return this;

        localStorage.setItem("hide-labels", String(hide));
        this.raise(this.eventHideRequestDescriptorChanged);
        return this;
    }

    getHideRequestDescriptor(): boolean {
        return localStorage.getItem("hide-labels") == "true";
    }

    setHideResponseDescriptor(hide: boolean): this {
        if (hide == this.getHideResponseDescriptor()) return this;

        localStorage.setItem("hide-res-labels", String(hide));
        this.raise(this.eventHideResponseDescriptorChanged);
        return this;
    }

    getHideResponseDescriptor(): boolean {
        return localStorage.getItem("hide-res-labels") == "true";
    }

    setPreferSingleLineUrl(prefer: boolean): this {
        if (prefer == this.getPreferSingleLineUrl()) return this;

        localStorage.setItem("single-line-url", String(prefer));
        this.raise(this.eventPreferSingleLineUrlChanged);
        return this;
    }

    getPreferSingleLineUrl(): boolean {
        return localStorage.getItem("single-line-url") == "true";
    }

    setColorTheme(theme: ColorTheme): this {
        if (theme == this.getColorTheme()) return this;

        localStorage.setItem("color-theme", theme);
        this.raise(this.eventColorThemeChanged);
        return this;
    }

    getColorTheme(): ColorTheme {
        let theme = localStorage.getItem("color-theme");

        if (theme == ColorTheme.Light) return ColorTheme.Light;
        return ColorTheme.Dark;
    }

    setCloseConsoleOnMouseLeave(close: boolean): this {
        if (close == this.getCloseConsoleOnMouseLeave()) return this;

        localStorage.setItem("close-console-on-mouse-leave", String(close));
        this.raise(this.eventCloseConsoleOnMouseLeaveChanged);
        return this;
    }

    getCloseConsoleOnMouseLeave(): boolean {
        return localStorage.getItem("close-console-on-mouse-leave") == "true";
    }

    setResponseLocation(location: ResponseControlLocation): this {
        if (location == this.getResponseLocation()) return this;
        localStorage.setItem("response-location", location);
        this.raise(this.eventResponseLocationChanged);
        return this;
    }

    getResponseLocation(): ResponseControlLocation {
        let location = <ResponseControlLocation>localStorage.getItem("response-location");
        if (!Object.values(ResponseControlLocation).includes(location))
            return ResponseControlLocation.Automatic;
        return location;
    }

    setAutoHideParameters(autoHide: boolean): this {
        if (autoHide == this.getAutoHideParameters()) return this;

        localStorage.setItem("auto-hide-parameters", String(autoHide));
        this.raise(this.eventAutoHideParametersChanged);
        return this;
    }

    getAutoHideParameters(): boolean {
        return localStorage.getItem("auto-hide-parameters") == "true";
    }

}

export let PreferenceStore = new HttpinessPreferences();
