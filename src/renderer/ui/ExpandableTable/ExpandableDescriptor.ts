import { Div } from "aflon";

import { Colors, FontStyles } from "../StyleConstants";

export class ExpandableDescriptor extends Div {
    private _descriptorTriangle: Div;
    private _descriptorText: Div;

    private _expanded: boolean = true;
    private _descriptorTextShown: boolean = true;

    constructor() {
        super();

        this.append([
            (this._descriptorTriangle = new Div())
                .setText("▶")
                .setInlineCss({ transform: "rotate(90deg)" }),
            (this._descriptorText = new Div())
        ]);
    }

    setText(text: string): this {
        this._descriptorText.setText(text);
        return this;
    }

    getText(): string {
        return this._descriptorText.getText();
    }

    setDescriptorTextShown(shown: boolean): this {
        if (shown == this._descriptorTextShown) return this;

        this._descriptorTextShown = shown;

        if (this._descriptorTextShown) {
            this.setInlineCss({
                width: "80px",
                marginRight: "20px"
            });
            this._descriptorText.setInlineCss({
                display: "inline-block"
            });
        } else {
            this.setInlineCss({
                width: "20px",
                marginRight: "10px"
            });
            this._descriptorText.setInlineCss({
                display: "none"
            });
        }

        return this;
    }

    getDescriptorTextShown(): boolean {
        return this._descriptorTextShown;
    }

    setExpanded(expanded: boolean): this {
        if (expanded == this._expanded) return this;

        this._expanded = expanded;

        if (this._expanded) {
            this._descriptorTriangle.setInlineCss({
                transform: "rotate(90deg)"
            });
        } else {
            this._descriptorTriangle.setInlineCss({
                transform: "none"
            });
        }

        return this;
    }

    getExpanded(): boolean {
        return this._expanded;
    }

    showExpanderTriangle(): void {
        this._descriptorTriangle.setInlineCss({
            opacity: "1"
        });
    }

    hideExpanderTriangle(): void {
        this._descriptorTriangle.setInlineCss({
            opacity: "0"
        });
    }
}

ExpandableDescriptor.style = {
    _: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDescriptor,
        fontSize: "12px",
        cursor: "pointer",
        textAlign: "right",
        lineHeight: "20px",
        marginRight: "20px",
        width: "80px"
    },
    _descriptorTriangle: {
        display: "inline-block",
        fontSize: "10px",
        opacity: "0"
    },
    _descriptorText: {
        marginLeft: "5px",
        display: "inline-block"
    }
};
