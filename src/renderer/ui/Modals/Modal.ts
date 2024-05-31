import { Div, Element } from "aflon";
import { BoxShadowValues, Colors, FontStyles, ZIndexLayers } from "../StyleConstants";

export abstract class ModalContent<TResult> extends Element {
    public eventResultReady;
    public abstract getResult(): TResult;
}

export class Modal extends Div {
    private _background: Div;
    private _container: Div;

    constructor() {
        super();

        this.append([
            (this._background = new Div())
                .on(this.eventClick, async () => {
                    await this.animations("pingOut").startAsync();
                    this.animations("pingIn").start();
                }),
            (this._container = new Div())
        ]);
    }

    async show<TResult = void>(content: ModalContent<TResult>): Promise<TResult> {
        return new Promise((resolve) => {
            content.on(content.eventResultReady, () => {
                this.hide();
                resolve(content.getResult());
            });

            this._container.append([ content ]);
            document.body.append(this.getHtmlElement());
            this.animations("show").start();
        });
    }

    async hide(): Promise<void> {
        await this.animations("hide").startAsync();
        document.body.removeChild(this.getHtmlElement());
    }
}

Modal.style = {
    _: {
        position: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        top: 0,
        zIndex: ZIndexLayers.modal
    },
    _background: {
        position: "absolute",
        width: "100%",
        height: "100%"
    },
    _container: {
        ...FontStyles.sansSerifNormal,
        background: Colors.consoleBackground,
        borderTop: `solid 1px ${Colors.consoleBorder}`,
        boxShadow: BoxShadowValues.consoleExtended,
        color: Colors.browserDefault,
        display: "flex",
        flexFlow: "column nowrap",
        borderRadius: "20px 20px 20px 20px",
        padding: "20px",
        opacity: 0,
        transform: "scale(0.9)",
        maxWidth: "80%",
        maxHeight: "80%"
    }
};

Modal.animations = {
    show: {
        animations: [
            { track: "opacity", to: 1, duration: 75, ease: "linear", target: "_container"},
            { track: "transform", to: "scale(1.0)", target: "_container" }
        ],
        ease: "easeOut",
        duration: 150
    },
    hide: {
        animations: [
            { track: "opacity", to: 0, duration: 75, delay: 75, ease: "linear", target: "_container"},
            { track: "transform", to: "scale(0.7)", target: "_container" }
        ],
        ease: "easeIn",
        duration: 150
    },
    pingOut: {
        animations: [
            { track: "transform", to: "scale(1.05)", target: "_container" }
        ],
        ease: "easeOut",
        duration: 50
    },
    pingIn: {
        animations: [
            { track: "transform", to: "scale(1.0)", target: "_container" }
        ],
        ease: "easeIn",
        duration: 50
    }
};
