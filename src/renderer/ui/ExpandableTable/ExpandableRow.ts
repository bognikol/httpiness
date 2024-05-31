import { Element, Div } from "aflon";

import { FontStyles, Colors } from "../StyleConstants";
import { ExpandableDescriptor } from "./ExpandableDescriptor";

export class ExpandableRow extends Div {
    protected _descriptor: ExpandableDescriptor;
    protected _container: Div;
    protected _containerPlaceholder: Div;

    constructor() {
        super();

        this.append([
            (this._descriptor = new ExpandableDescriptor())
                .setText("Title")
                .on(this._descriptor.eventClick, () => this._onDescriptorClick()),
            (this._container = new Div()),
            (this._containerPlaceholder = new Div())
                .setText("...")
                .on(this._descriptor.eventClick, () => this._onDescriptorClick())
        ]);

        this.on(this.eventMouseEnter, () => this._descriptor.showExpanderTriangle());
        this.on(this.eventMouseLeave, () => this._descriptor.hideExpanderTriangle());
    }

    setTitle(title: string): this {
        this._descriptor.setText(title);
        return this;
    }

    getTitle(): string {
        return this._descriptor.getText();
    }

    setDescriptorShown(shown: boolean): this {
        this._descriptor.setDescriptorTextShown(shown);
        return this;
    }

    getDescriptorShown(): boolean {
        return this._descriptor.getDescriptorTextShown();
    }

    setExpanded(expanded: boolean): this {
        this._descriptor.setExpanded(expanded);
        this._executeExpand(expanded);

        return this;
    }

    getExpanded(): boolean {
        return this._descriptor.getExpanded();
    }

    appendContent(items: Array<Element>): this {
        this._container.append(items);
        return this;
    }

    protected _executeExpand(expanded: boolean): void {
        if (!expanded) {
            this._container.setInlineCss({ display: "none" });
            this._containerPlaceholder.setInlineCss({ display: "block" });
        } else {
            this._container.setInlineCss({ display: "flex" });
            this._containerPlaceholder.setInlineCss({ display: "none" });
        }
    }

    private _onDescriptorClick(): void {
        this.setExpanded(!this.getExpanded());
    }
}

ExpandableRow.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap"
    },
    _container: {
        flex: "1 0 200px",
        display: "flex",
        flexFlow: "column nowrap",
        minWidth: "0"
    },
    _containerPlaceholder: {
        ...FontStyles.monoSpace,
        color: Colors.workspacePlaceholder,
        display: "none",
        cursor: "pointer"
    }
};
