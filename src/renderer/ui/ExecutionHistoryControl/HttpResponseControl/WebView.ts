import { Element } from "aflon";
import { HttpResponseBody } from "../../../lib/http";
import { Colors } from "../../StyleConstants";

export class WebView extends Element {
    private _webview: Electron.WebviewTag = null;

    setContent(body: HttpResponseBody): this {
        if (!this._webview) return this;

        this._webview.loadURL(`data:${body.getContentType().getValue()},${encodeURIComponent(body.toString("utf-8"))}`, {
            baseURLForDataURL: body.getBaseUrl()
        });

        return this;
    }

    protected _createElement(): HTMLElement {
        const webview = document.createElement("webview");
        webview.style.height = "100%";
        webview.style.width = "100%";
        webview.src = "about:blank";

        const load = (): void => {
            this._webview = webview;
            webview.removeEventListener("dom-ready", load);
        };

        webview.addEventListener("dom-ready", load);

        const container = document.createElement("div");
        container.appendChild(webview);
        return container;
    }
}

WebView.style = {
    _: {
        background: "white",
        border:  `1px solid ${Colors.consoleBorder}`
    }
};
