import { Div } from "aflon";

import { Button } from "../BasicControls";
import { ToastContent } from "../Toast";

export class FeedbackToastContent extends Div implements ToastContent<boolean> {
    eventResultReady = "resultReady";

    private _hand: Div;
    private _title: Div;
    private _subtitle: Div;
    private _yesButton: Button;
    private _noButton: Button;

    private _result: boolean = false;

    constructor() {
        super();

        this.append([
            this._hand = new Div().setText("✋"),
            this._title = new Div().setText("We kindly ask for your feedback."),
            this._subtitle = new Div().setText("Our ambition is to create simple, developer-friendly \
                HTTP client tailored for rapid and responsive testing during development. \
                Reporting issues and giving feedback helps us a lot."),
            (this._yesButton = new Button().setText("Give feedback now"))
                .on(this._yesButton.eventClick, () => this._onYesClick()),
            (this._noButton = new Button().setText("Maybe later"))
                .on(this._noButton.eventClick, () => this._onNoClick())
        ]);
    }

    public getResult(): boolean {
        return this._result;
    }

    private _onYesClick(): void {
        this._result = true;
        this.raise(this.eventResultReady);
    }

    private _onNoClick(): void {
        this.raise(this.eventResultReady);
    }
}

FeedbackToastContent.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        gap: "10px",
        marginTop: "-30px"
    },
    _text: {
        fontSize: "14px"
    },
    _subtitle: {
        fontSize: "11px",
        marginBottom: "10px"
    },
    _hand: {
        fontSize: "40px"
    }
};
