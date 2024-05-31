import { Div } from "aflon";

import { minimize, goFullScreen, exitFullScreen, isInFullScreen, close } from "../../lib/WindowManipulation";

export class MacOsControlBox extends Div {
    private _closeButton: Div;
    private _minimizeButton: Div;
    private _maximizeButton: Div;

    constructor() {
        super();

        this.append([
            (this._closeButton = new Div())
                .on(this._closeButton.eventClick, () => close()),
            (this._minimizeButton = new Div())
                .on(this._minimizeButton.eventClick, () => minimize()),
            (this._maximizeButton = new Div())
                .on(this._maximizeButton.eventClick, () => this._onMaximizeButtonClick())
        ]);
    }

    hide(): void {
        this.animations("show").stop();
        this.animations("hide").start();
    }

    show(): void {
        this.animations("hide").stop();
        this.animations("show").start();
    }

    private async _onMaximizeButtonClick(): Promise<void> {
        if   (await isInFullScreen()) exitFullScreen();
        else                          goFullScreen();
    }
}

MacOsControlBox.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        width: "0",
        justifyContent: "space-evenly"
    },
    _closeButton: {
        background: "#FC605C",
        width: "11px",
        height: "11px",
        borderRadius: "6px",
        opacity: 0
    },
    _minimizeButton: {
        background: "#FCBB40",
        width: "11px",
        height: "11px",
        borderRadius: "6px",
        opacity: 0
    },
    _maximizeButton: {
        background: "#34C648",
        width: "11px",
        height: "11px",
        borderRadius: "6px"
    }
};

MacOsControlBox.animations = {
    show: {
        animations: [
            { track: "width", to: "80px", ease: "circOut", duration: 300 },
            { target: "_closeButton", track: "opacity", to: 1.0, duration: 200, delay: 0 },
            { target: "_minimizeButton", track: "opacity", to: 1.0, duration: 200, delay: 0 },
            { target: "_maximizeButton", track: "opacity", to: 1.0, duration: 200, delay: 0 }
        ]
    },
    hide: {
        animations: [
            { track: "width", to: "0px", ease: "circOut", duration: 300, delay: 100 },
            { target: "_closeButton", track: "opacity", to: 0, duration: 200 },
            { target: "_minimizeButton", track: "opacity", to: 0, duration: 200 },
            { target: "_maximizeButton", track: "opacity", to: 0, duration: 200 }
        ]
    }
};
