import { Div } from "aflon";

import { Button } from "../BasicControls";
import { FontStyles } from "../StyleConstants";

import { Modal, ModalContent } from "./Modal";

class SimpleModalContentButton<TResult> {
    text: string;
    result?: TResult;
    default?: boolean;
}

class SimpleModalContent<TResult> extends Div implements ModalContent<TResult> {
    public eventResultReady = "resultReady";

    private _logo: Div;
    private _message: Div;
    private _button: Button;

    private _result: TResult = null;

    constructor(message: string, buttons: Array<SimpleModalContentButton<TResult>> = [{ text: "OK" }]) {
        super();

        this
            .append([
                (this._logo = new Div()),
                (this._message = new Div())
                    .setText(message)
            ])
            .append(buttons.map(button => {
                let btnElem = new Button()
                    .addCssClass({ marginBottom: "10px" })
                    .setText(button.text)
                    .on("click", () => {
                        this._result = button.result;
                        this.raise(this.eventResultReady);
                    });
                if (button.default) {
                    setTimeout(() => btnElem.focus(), 0);
                }
                return btnElem;
            }));
    }

    public getResult(): TResult {
        return this._result;
    }
}

SimpleModalContent.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "stretch",
        minWidth: "150px",
        maxWidth: "300px"
    },
    _logo: {
        height: "40px",
        backgroundImage: "url(./resources/images/WelcomeIcon.svg)",
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        opacity: "0.5",
        marginTop: "20px",
        marginBottom: "40px"
    },
    _message: {
        ...FontStyles.sansSerifNormal,
        fontSize: "12px",
        marginBottom: "40px",
        overflowWrap: "break-word",
        whiteSpace: "pre-line",
        textAlign: "center"
    }
};

export class SimpleModals {
    static async confirm(text: string): Promise<boolean> {
        return await new Modal().show<boolean>(new SimpleModalContent<boolean>(text,
            [{ text: "Yes", result: true },  { text: "No", result: false }])
        );
    }

    static async choose(text: string, options: Array<{ text: string, id: string, default?: boolean }>): Promise<string> {
        return await new Modal().show<string>(new SimpleModalContent<string>(text,
            options.map<SimpleModalContentButton<string>>(option => ({ text: option.text, result: option.id, default: option.default })))
        );
    }

    static async alert(text: string, button: string = "OK"): Promise<void> {
        return await new Modal().show<void>(new SimpleModalContent<void>(text, [{ text: button }]));
    }
}
