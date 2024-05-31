import { Element } from "aflon";

export class IFrame extends Element {
    constructor() {
        super();

        this.on(this.eventLoad, (): void => {
            this.getHtmlElement().style.height = (<HTMLIFrameElement>(this.getHtmlElement())).contentWindow.document.body.scrollHeight + 20 + "px";
        });

        this.addAttr("scrolling", "no");
    }

    setSrc(src: string): this {
        this.removeAttr("src");
        this.addAttr("src", src);
        return this;
    }

    getSrc(): string {
        return this.getAttr("src");
    }

    setSrcDoc(content: string): this {
        this.removeAttr("srcdoc");
        this.addAttr("srcdoc", content);
        return this;
    }

    getSrcDoc(): void {
        this.getAttr("srcdoc");
    }

    protected _createElement(): HTMLElement {
        return document.createElement("iframe");
    }
}
