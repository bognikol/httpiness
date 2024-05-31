import { Div, Span } from "aflon";

import { openFileInDefaultApp } from "../../lib/Platform";
import { Telemetry, TelemetryEvent } from "../../lib/Telemetry";

import { Icon } from "../Icon";
import { Colors, FontStyles } from "../StyleConstants";

class WelcomeActions extends Div {

    private _icon: Icon;
    private _title: Div;

    constructor(iconName: string) {
        super();

        this.append([
            (this._icon = new Icon(iconName)),
            (this._title = new Div())
        ]);
    }

    setIconRightOffset(offset: number): this {
        this._icon.setInlineCss({
            paddingRight: `${offset}px`
        });
        return this;
    }

    setIconTopOffset(offset: number): this {
        this._icon.setInlineCss({
            paddingTop: `${offset}px`
        });
        return this;
    }

    setText(text: string): this {
        this._title.setText(text);
        return this;
    }

    getText(): string {
        return this._title.getText();
    }
}

WelcomeActions.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        height: "30px",
        alignItems: "center"
    },
    _icon: {
        width: "30px",
        marginRight: "10px",
        textAlign: "right",
        fontSize: "16px"
    },
    _title: {
        fontSize: "12px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "inline-block",
        "&:hover": {
            textDecoration: "underline"
        }
    }
};

class FeedbackControl extends Div {

    private _hand: Div;
    private _title: Div;
    private _details: Div;
    private _links: Div;
    private _reportIssue: Span;
    private _giveFeedback: Span;

    constructor() {
        super();

        this.append([
            (this._hand = new Div())
                .setText("✋"),
            new Div().append([
                (this._title = new Div())
                    .setText("We kindly ask for your feedback."),
                (this._details = new Div())
                    .setText("Our ambition is to create simple, developer-friendly \
                    HTTP client tailored for rapid and responsive testing during development. \
                    Reporting issues and giving feedback helps us a lot."),
                (this._links = new Div())
                    .append([
                        (this._reportIssue = new Span())
                            .setText("Report an issue")
                            .on(this._reportIssue.eventClick, () => openFileInDefaultApp("https://forms.gle/nC7XvMZLXXPHyRik9")),
                        (this._giveFeedback = new Span())
                            .setText("Give feedback")
                            .on(this._reportIssue.eventClick, () => {
                                Telemetry.reportEvent(TelemetryEvent.FeedbackSent);
                                openFileInDefaultApp("https://forms.gle/CMN15fRycYADAAbT6");
                            })
                    ])
            ])
        ]);
    }
}

FeedbackControl.style = {
    _: {
        fontSize: "12px",
        display: "flex",
        flexFlow: "row nowrap"
    },
    _hand: {
        fontSize: "30px",
        marginRight: "10px"
    },
    _title: {
        fontSize: "12px",
        fontWeight: "bold",
        marginBottom: "7px",
        marginTop: "10px"
    },
    _details: {
        fontSize: "11px",
        lineHeight: "15px"
    },
    _links: {
        marginTop: "10px",
        fontSize: "11px",
        lineHeight: "15px",
        textDecoration: "underline",
        cursor: "pointer"
    },
    _reportIssue: {
        marginRight: "10px",
        cursor: "pointer"
    }
};

export class WelcomeControl extends Div {
    public eventActionRequested: "actionRequested";

    private _logo: Div;
    private _options: Div;
    private _separator: Div;
    private _giveFeedback: FeedbackControl;

    constructor() {
        super();

        this.append([
            (this._logo = new Div()),
            (this._options = new Div())
                .append([
                    new WelcomeActions("new-file")
                        .setText("Create new collection")
                        .on("click", () => this._onCreateNewCollection()),
                    new WelcomeActions("import")
                        .setText("Import existing collection")
                        .on("click", () => this._onImportCollection()),
                    new WelcomeActions("import-3rd")
                        .setText("Import 3rd-party collection")
                        .on("click", () => this._onImportCollection()),
                    (this._separator = new Div()),
                    new WelcomeActions("send")
                        .setText("Send http request")
                        .setIconTopOffset(2)
                        .on("click", () => this._onSendHttpRequestRequested()),
                    new WelcomeActions("docs")
                        .setText("Read docs")
                        .setIconRightOffset(1.5)
                        .on("click", () => this._onReadDocs())
                ]),
            (this._giveFeedback = new FeedbackControl())
        ]);

        this._onViewportChange();
        visualViewport.addEventListener("resize", this._onViewportChange);
    }

    protected _onLeavingDom(): void {
        visualViewport.removeEventListener("resize", this._onViewportChange);
    }

    private _onViewportChange = (): void => {
        if (visualViewport.height <= 800) {
            this._logo.setVisibility(false);
            return;
        }

        this._logo.setVisibility(true);
    };

    private _onSendHttpRequestRequested(): void {
        this.raise(this.eventActionRequested, { action: "send-request" });
    }

    private _onCreateNewCollection(): void {
        this.raise(this.eventActionRequested, { action: "create" });
    }

    private _onImportCollection(): void {
        this.raise(this.eventActionRequested, { action: "import" });
    }

    private _onReadDocs(): void {
        this.raise(this.eventActionRequested, { action: "docs" });
    }
}

WelcomeControl.style = {
    _: {
        ...FontStyles.sansSerifNormal,
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "center",
        justifyContent: "space-evenly",
        color: Colors.workspacePlaceholder,
        paddingBottom: "30px"
    },
    _logo: {
        width: "250px",
        height: "170px",
        backgroundImage: "url(./resources/images/WelcomeIcon.svg)",
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        opacity: "0.5"
    },
    _options: {
        width: "220px",
        color: Colors.workspaceDefault,
        transition: "opacity 0.5s",
        opacity: "0.5",
        "&:hover": {
            opacity: "1.0",
            transition: "opacity 0.5s"
        }
    },
    _separator: {
        height: "1px",
        background: Colors.workspacePlaceholder,
        marginTop: "10px",
        marginBottom: "10px"
    },
    _giveFeedback: {
        width: "520px",
        maxWidth: "80%",
        color: Colors.workspaceDefault,
        opacity: "0.6",
        transition: "opacity 0.5s",
        "&:hover": {
            opacity: "1.0",
            transition: "opacity 0.5s"
        }
    }
};
