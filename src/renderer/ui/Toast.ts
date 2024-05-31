import { Div, Element } from "aflon";
import { BoxShadowValues, Colors, FontStyles, ZIndexLayers } from "./StyleConstants";
import { Icon } from "./Icon";

export abstract class ToastContent<TResult> extends Element {
    public eventResultReady: string;
    public abstract getResult(): TResult;
}

abstract class ToastElementBase extends Div {
    abstract cancel(): void;
}

class ToastElement<TResult> extends ToastElementBase {
    public eventAboutToBeHidden = "aboutToBeHidden";

    private _closeBtn: Icon;
    private _content: ToastContent<TResult>;

    private _hideAfterSeconds: number = 10;
    private _resolveToastResult: () => void = null;

    constructor(content: ToastContent<TResult>, hideAfterSeconds: number = 10) {
        super();

        this.append([
            this._closeBtn = new Icon("result")
                .on(this.eventClick, () => this.cancel()),
            this._content = content
        ]);

        this._hideAfterSeconds = hideAfterSeconds;
    }

    getResult(): TResult {
        return this._content.getResult();
    }

    async show(): Promise<TResult> {
        return new Promise((resolve) => {
            let timeoutId: NodeJS.Timeout = null;

            this._resolveToastResult = (): void => {
                this._content.off(this._content.eventResultReady, this._resolveToastResult);

                if (timeoutId != null)
                    clearTimeout(timeoutId);

                this._hide();
                resolve(this._content.getResult());
            };

            this._content.on(this._content.eventResultReady, this._resolveToastResult);
            timeoutId = setTimeout(this._resolveToastResult, this._hideAfterSeconds * 1000);

            document.body.append(this.getHtmlElement());
            this.animations("show").start();
        });
    }

    cancel(): void {
        if (this._resolveToastResult)
            this._resolveToastResult();
    }

    private async _hide(): Promise<void> {
        await this.animations("hide").startAsync();
        document.body.removeChild(this.getHtmlElement());
    }
}

ToastElement.style = {
    _: {
        ...FontStyles.sansSerifNormal,
        background: Colors.consoleBackground,
        borderTop: `solid 1px ${Colors.consoleBorder}`,
        boxShadow: BoxShadowValues.consoleExtended,
        color: Colors.browserDefault,
        position: "fixed",
        display: "flex",
        flexFlow: "column nowrap",
        borderRadius: "20px 20px 20px 20px",
        padding: "20px",
        paddingTop: "60px",
        zIndex: ZIndexLayers.modal,
        right: "-400px",
        width: "300px",
        minHeight: "200px",
        maxHeight: "500px",
        bottom: "20px"
    },
    _closeBtn: {
        position: "absolute",
        right: "20px",
        top: "20px",
        cursor: "pointer",
        color: Colors.workspaceDefault,
        "&:hover": {
            color: Colors.workspaceDescriptor
        }
    }
};

ToastElement.animations = {
    show: {
        animations: [
            { track: "right", from: "-400px", to: "20px" }
        ],
        ease: "circOut",
        duration: 300
    },
    hide: {
        animations: [
            { track: "right", to: "-400px" }
        ],
        ease: "easeIn",
        duration: 150
    }
};

export class Toast {
    private static _currentToastElement: ToastElementBase = null;

    public static async show<TResult>(content: ToastContent<TResult>, hideAfterSeconds: number = 10): Promise<TResult> {
        let toast = new ToastElement(content, hideAfterSeconds);

        if (Toast._currentToastElement != null) {
            Toast._currentToastElement.cancel();
        }

        Toast._currentToastElement = toast;

        return new Promise((resolve) => {
            toast.show().then(result => {
                if (Toast._currentToastElement == toast)
                    Toast._currentToastElement = null;
                resolve(result);
            });
        });
    }
}
