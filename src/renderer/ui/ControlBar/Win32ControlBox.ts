import { Div } from "aflon";

import { minimize, close, isMaximized, maximize, unmaximize } from "../../lib/WindowManipulation";

import { Colors } from "../StyleConstants";
import { Icon } from "../Icon";
import { Tooltip } from "../ContextMenu";

export class Win32ControlBox extends Div {
    private _minimizeButton: Div;
    private _maximizeButton: Div;
    private _closeButton: Div;

    constructor() {
        super();

        this.append([
            (this._minimizeButton = new Div())
                .append([ new Icon("minimize") ])
                .on(this._minimizeButton.eventClick, () => minimize()),
            (this._maximizeButton = new Div())
                .append([ new Icon("maximize") ])
                .on(this._maximizeButton.eventClick, () => this._onMaximizeButtonClick()),
            (this._closeButton = new Div())
                .append([ new Icon("close") ])
                .on(this._closeButton.eventClick, () => close())
        ]);

        new Tooltip(this._minimizeButton).setText("Minimize");
        new Tooltip(this._maximizeButton).setText("Maximize");
        new Tooltip(this._closeButton).setText("Close");
    }

    private async _onMaximizeButtonClick(): Promise<void> {
        if   (await isMaximized()) unmaximize();
        else                       maximize();
    }
}

Win32ControlBox.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        justifyContent: "center",
        width: "110px",
        color: Colors.browserDefault,
        fontSize: "12px",
        borderLeft: `solid 1px ${Colors.workspaceLine}`
    },
    _minimizeButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "29px",
        textAlign: "center",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _maximizeButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "32px",
        paddingLeft: "2px",
        textAlign: "center",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _closeButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "29px",
        textAlign: "center",
        "&:hover": {
            color: Colors.consoleDominant
        }
    }
};
