import { Div } from "aflon";

import { HttpRequest, HttpHeaderRecord, HttpBody, HttpRequestMethod, IReadOnlyMacroContext } from "../../lib/http";

import { FocusLeaveDirection } from "../IKeyboardNavigable";

import { UrlControl, UrlControlMode } from "./UrlControl";
import { HttpHeadersControl } from "./HttpHeadersControl";
import { HttpBodyControl } from "./HttpBodyControl";


export class HttpRequestControl extends Div {
    public eventMethodChanged  = "methodChanged";
    public eventUrlChanged     = "urlChanged";
    public eventHeadersChanged = "headersChanged";
    public eventBodyChanged    = "bodyChanged";
    public eventSendRequested  = "sendRequested";
    public eventRevertBodyToDefaultRequested = "revertBodyToDefaultRequested";
    public eventSaveCurrentBodyAsDefaultRequested = "saveCurrentBodyAsDefaultRequested";

    private _descriptorShown: boolean;

    private _urlControl: UrlControl;
    private _httpHeadersControl: HttpHeadersControl;
    private _httpBodyControl: HttpBodyControl;

    constructor() {
        super();

        this.append([
            (this._urlControl = new UrlControl())
                .on(this._urlControl.eventMethodChanged, () => this._onMethodChanged())
                .on(this._urlControl.eventUrlChanged, () => this.raise(this.eventUrlChanged))
                .on(this._urlControl.eventSendRequested, () => this.raise(this.eventSendRequested))
                .on(this._urlControl.eventFocusLeaveRequested, e => this._onUrlFocusLeaveRequested(e))
                .on(this._urlControl.eventCurlCommandPasted, e => this._onCurlCommandPasted(e)),
            (this._httpHeadersControl = new HttpHeadersControl())
                .on(this._httpHeadersControl.eventHeadersChanged, () => this.raise(this.eventHeadersChanged))
                .on(this._httpHeadersControl.eventFocusLeaveRequested, e => this._onHeaderFocusLeaveRequested(e)),
            (this._httpBodyControl = new HttpBodyControl())
                .on(this._httpBodyControl.eventBodyChanged, () => this._onBodyChanged())
                .on(this._httpBodyControl.eventFocusLeaveRequested, e => this._onBodyFocusLeaveRequested(e))
                .on(this._httpBodyControl.eventDefaultContentTypeChangeRequested, () => this._onDefaultContentTypeChangeRequested())
        ]);
    }

    setDescriptorShown(shown: boolean): this {
        if (this._descriptorShown == shown) return this;

        this._descriptorShown = shown;

        this._urlControl.setDescriptorShown(this._descriptorShown);
        this._httpHeadersControl.setDescriptorShown(this._descriptorShown);
        this._httpBodyControl.setDescriptorShown(this._descriptorShown);

        return this;
    }

    getDescriptorShown(): boolean {
        return this._descriptorShown;
    }

    setUrlEditMode(mode: UrlControlMode): this {
        this._urlControl.setUrlControlMode(mode);
        return this;
    }

    getUrlEditMode(): UrlControlMode {
        return this._urlControl.getUrlControlMode();
    }

    setHttpRequest(request: HttpRequest, macroContext: IReadOnlyMacroContext): this {
        this.expandAll();

        this._urlControl
            .setHttpMethod(request.method)
            .setMacroContext(macroContext)
            .setUrl(request.url);
        this._httpHeadersControl.setHeaders(request.headers);

        if (request.method != HttpRequestMethod.POST &&
            request.method != HttpRequestMethod.PUT &&
            request.method != HttpRequestMethod.PATCH &&
            request.method != HttpRequestMethod.DELETE &&
            request.method != HttpRequestMethod.OPTIONS) {
            this._httpBodyControl.setInlineCss({ display: "none" });
        } else {
            this._httpBodyControl.setInlineCss({ display: "flex" });
        }

        this._httpBodyControl
            .setHttpBody(request.body)
            .setMacroContext(macroContext);

        return this;
    }

    getHttpRequest(): HttpRequest {
        let request = new HttpRequest();
        request.method = this._urlControl.getHttpMethod();
        request.url = this._urlControl.getUrl();
        request.headers = this._httpHeadersControl.getHeaders();
        request.body = this.getBody();
        return request;
    }

    getHttpMethod(): HttpRequestMethod {
        return this._urlControl.getHttpMethod();
    }

    getUrl(): string {
        return this._urlControl.getUrl();
    }

    getHeaders(): Array<HttpHeaderRecord> {
        return this._httpHeadersControl.getHeaders();
    }

    getBody(): HttpBody {
        if (this.getHttpMethod() == HttpRequestMethod.POST ||
            this.getHttpMethod() == HttpRequestMethod.PUT ||
            this.getHttpMethod() == HttpRequestMethod.PATCH ||
            this.getHttpMethod() == HttpRequestMethod.DELETE ||
            this.getHttpMethod() == HttpRequestMethod.OPTIONS)
            return this._httpBodyControl.getHttpBody();

        return null;
    }

    expandAll(): void {
        // do not expand this._urlControl; condensed url control is single-line
        this._httpHeadersControl.setExpanded(true);
        this._httpBodyControl.setExpanded(true);
    }

    private _onUrlFocusLeaveRequested(e: Event): void {
        let direction: FocusLeaveDirection = <FocusLeaveDirection> e["detail"]["direction"];

        switch (direction) {
            case FocusLeaveDirection.Down:
            case FocusLeaveDirection.Right:
                this._httpHeadersControl.setCaretPosition({ row: 0, column: 0 });
                break;
        }
    }

    private _onCurlCommandPasted(e): void {
        let request = <HttpRequest>e["detail"].request;

        if (!request) return;

        this.setHttpRequest(request, this._urlControl.getMacroContext());

        this.raise(this.eventMethodChanged);
        this.raise(this.eventUrlChanged);
        this.raise(this.eventHeadersChanged);
        this.raise(this.eventBodyChanged);
    }

    private _onHeaderFocusLeaveRequested(e: Event): void {
        let direction: FocusLeaveDirection = <FocusLeaveDirection> e["detail"]["direction"];

        switch (direction) {
            case FocusLeaveDirection.Up:
                this._urlControl.setCaretPosition({ row: -1, column: 0 });
                break;
            case FocusLeaveDirection.Left:
                this._urlControl.setCaretPosition({ row: -1, column: -1 });
                break;
            case FocusLeaveDirection.Down:
            case FocusLeaveDirection.Right:
                this._httpBodyControl.setCaretPosition({ row: 0, column: 0 });
                break;
        }
    }

    private _onBodyFocusLeaveRequested(e: Event): void {
        let direction: FocusLeaveDirection = <FocusLeaveDirection> e["detail"]["direction"];

        switch (direction) {
            case FocusLeaveDirection.Up:
                this._httpHeadersControl.setCaretPosition({ row: -1, column: 0 });
                break;
            case FocusLeaveDirection.Left:
                this._httpHeadersControl.setCaretPosition({ row: -1, column: -1 });
                break;
        }
    }

    private _onMethodChanged(): void {
        const method = this._urlControl.getHttpMethod();

        if (method == HttpRequestMethod.NONE) return;

        if (method == HttpRequestMethod.POST ||
            method == HttpRequestMethod.PUT ||
            method == HttpRequestMethod.PATCH ||
            method == HttpRequestMethod.DELETE ||
            method == HttpRequestMethod.OPTIONS) {
            this._httpBodyControl.setInlineCss({ display: "flex" });
        } else {
            this._httpBodyControl.setInlineCss({ display: "none" });
        }

        this.raise(this.eventMethodChanged);
    }

    private _onBodyChanged(): void {
        this.raise(this.eventBodyChanged);
    }

    private _onDefaultContentTypeChangeRequested(): void {
        let headers = this._httpHeadersControl.getHeaders();

        let contentTypeHeader = headers.find(header => header.name.trim().toLowerCase() == "content-type");

        if (!contentTypeHeader) {
            headers = [ { name: "Content-Type", value: this._httpBodyControl.getDefaultContentType() }, ...headers ];
        } else {
            contentTypeHeader.value = this._httpBodyControl.getDefaultContentType();
        }

        this._httpHeadersControl.setHeaders(headers);
    }
}

HttpRequestControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _urlControl: {
        marginBottom: "20px"
    },
    _httpHeadersControl: {
        marginBottom: "20px"
    },
    _httpBodyControl: {
        marginBottom: "20px"
    }
};
