import { AbstractButton, Div } from "aflon";

import { Colors } from "./StyleConstants";
import { Icon } from "./Icon";
import { Tooltip } from "./ContextMenu";

export class IconButton extends Div implements AbstractButton {
    eventChange: string;
    eventInput: string;

    private _tooltip: Tooltip = null;

    constructor(iconName: string) {
        super();

        this.append([
            new Icon(iconName)
        ])
            .on(this.eventClick, e => this._onClick(e));

        if (iconName == "new-req")
            this.setInlineCss({ fontSize: "12px" });
    }

    setDisabled(disabled: boolean): this {
        if (disabled) {
            this.addAttr("disabled");
            this.setInlineCss({
                cursor: "default",
                color: Colors.workspacePlaceholder
            });
        } else {
            this.removeAttr("disabled");
            this.setInlineCss({
                cursor: "pointer",
                color: "inherit"
            });
        }

        return this;
    }

    getDisabled(): boolean {
        return this.hasAttr("disabled");
    }

    focus(): void {
        // do nothing, this button is not focusable
        return;
    }

    blur(): void {
        this.getHtmlElement().blur();
    }

    setTooltip(text: string): this {
        if (this._tooltip == null)
            this._tooltip = new Tooltip(this);

        this._tooltip.setText(text);
        return this;
    }

    getTooltip(): string {
        return this._tooltip.getText();
    }

    private _onClick(e: Event): void {
        if (!this.getDisabled()) return;
        e.stopImmediatePropagation();
    }
}

IconButton.style = {
    _: {
        width: "21px",
        height: "25px",
        lineHeight: "25px",
        textAlign: "center",
        paddingTop: "1px",
        color: Colors.browserDefault,
        fontSize: "13px",
        cursor: "pointer",
        "&:hover": {
            color: Colors.workspaceDescriptor
        }
    }
};
