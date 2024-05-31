import { Div } from "aflon";

import { Colors } from "./StyleConstants";

export class VResizer extends Div {

    private _resizing: boolean = false;
    private _resizingCallback: (e: MouseEvent) => void;

    constructor() {
        super();
        this.on(this.eventMouseDown, () => {
            if (this._resizing) return;

            this._resizing = true;
            document.addEventListener("mousemove", this._handleResizing);
        });
    }

    setResizingCallback(callback: (e: MouseEvent) => void): this {
        this._resizingCallback = callback;
        return this;
    }

    getResizingCallback(): (e: MouseEvent) => void {
        return this._resizingCallback;
    }

    protected _onEnteringDom(): void {
        document.addEventListener("mouseup", this._onStoppingResizing);
        document.addEventListener("mouseleave", this._onStoppingResizing);
    }

    protected _onLeavingDom(): void {
        document.removeEventListener("mouseup", this._onStoppingResizing);
        document.removeEventListener("mouseleave", this._onStoppingResizing);
        document.removeEventListener("mousemove", this._handleResizing);
    }

    private _onStoppingResizing = (): void => {
        if (!this._resizing) return;

        this._resizing = false;
        document.removeEventListener("mousemove", this._handleResizing);
    };

    private _handleResizing = (e: Event): void => {
        this._resizingCallback(<MouseEvent>e);
    };
}

VResizer.style = {
    _: {
        width: "4px",
        marginLeft: "-2px",
        marginRight: "-2px",
        background: "transparent",
        cursor: "col-resize",
        transition: "background-color 0.5s",
        "&:hover": {
            backgroundColor: Colors.workspaceAccent,
            transition: "background-color 0.5s"
        }
    }
};
