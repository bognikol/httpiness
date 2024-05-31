import { TextBox, Div } from "aflon";

import { FontStyles, Colors } from "../StyleConstants";

export class BrowserItemName extends Div {
    public eventChange = "change";

    private _textBox: TextBox;
    private _overlay: Div;

    constructor() {
        super();

        this.append([
            (this._textBox = new TextBox())
                .setDisabled(true)
                .on(this._textBox.eventFocusOut, () => this._onTextBoxFocusOut())
                .on(this._textBox.eventClick, (e) => this._onTextBoxClick(e))
                .on(this._textBox.eventKeyDown, (e) => this._onTextBoxKeyDown(e)),
            (this._overlay = new Div())
        ]);
    }

    makeChangeReady(): this {
        this._overlay.setInlineCss({ display: "none" });
        this._textBox.setDisabled(false);
        this._textBox.focus();
        (<HTMLInputElement> this._textBox.getHtmlElement()).setSelectionRange(0, this.getText().length);
        return this;
    }

    setText(text: string): this {
        this._textBox.setText(text);
        return this;
    }

    getText(): string {
        return this._textBox.getText();
    }

    private _onTextBoxClick(e: Event): void {
        e.stopPropagation();
    }

    private _onTextBoxFocusOut(): void {
        this._overlay.setInlineCss({ display: "block" });
        this._textBox.setDisabled(true);
    }

    private _onTextBoxKeyDown(e: Event): void {
        const key = (<KeyboardEvent> e).key;

        if (key == "Enter") {
            this._onTextBoxFocusOut();
        }
    }
}

BrowserItemName.style = {
    _: {
        position: "relative"
    },
    _textBox: {
        ...FontStyles.sansSerifNormal,
        fontSize: "12px",
        color: Colors.browserDefault,
        border: "none",
        outline: "none",
        background: "none",
        position: "absolute",
        width: "100%",
        top: "3px",
        bottom: "3px"
    },
    _overlay: {
        background: "transparent",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: "pointer"
    }
};
