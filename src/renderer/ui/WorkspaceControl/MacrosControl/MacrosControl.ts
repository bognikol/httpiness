import { Div } from "aflon";

import { HttpCollection } from "../../../lib/http";
import { Telemetry, TelemetryEvent } from "../../../lib/Telemetry";
import { openFileInDefaultApp } from "../../../lib/Platform";

import { Toast } from "../../Toast";
import { FontStyles, Colors } from "../../StyleConstants";

import { FeedbackToastContent } from "../FeedbackToastContent";
import { MacroCollectionControl } from "./MacroCollectionControl";

export class MacrosFromCollection {
    collection: HttpCollection;
    macros: Array<string>;
}

export class MacrosControl extends Div {
    private static readonly _maxMacroNameLetterNum = 18;
    private static readonly _singleLetterWidth = 7.5;
    private static readonly _totalMargin = 25;

    private _header: Div;
    private _content: Div;

    private _collectionInFocus: HttpCollection = null;
    private _macrosInFocus: Array<string> = null;

    constructor() {
        super();

        this.append([
            (this._header = new Div())
                .setText("Parameters"),
            (this._content = new Div())
        ]);

        this.on(this.eventClick, () => this._onClick());
    }

    setMarcos(mcfs: Array<MacrosFromCollection>): this {
        this._content.empty();

        let maxMacroNameLetterNum: number = 0;

        mcfs.forEach(mcf => {
            mcf.macros.forEach(macro => {
                if (maxMacroNameLetterNum < macro.length)
                    maxMacroNameLetterNum = macro.length;
            });
        });

        if (maxMacroNameLetterNum > MacrosControl._maxMacroNameLetterNum)
            maxMacroNameLetterNum = MacrosControl._maxMacroNameLetterNum;

        let maxNameWidth = maxMacroNameLetterNum * MacrosControl._singleLetterWidth + MacrosControl._totalMargin;

        mcfs.forEach(mcf => {
            if (mcf.macros.length > 0) {
                this._content.append([
                    new MacroCollectionControl(mcf.collection).setMacroNames(mcf.macros, maxNameWidth)
                ]);
            }
        });

        this._emphasizeMacrosFromFocusedReqt();

        if (this._content.getChildrenNumber() > 0) {
            this._header.setInlineCss({ borderBottom: `solid 1px ${Colors.workspaceLine}` });
        } else {
            this._header.setInlineCss({ borderBottom: "none" });
        }

        return this;
    }

    setFocusedMacros(collection: HttpCollection, macros: Array<string>): this {
        this._collectionInFocus = collection;
        this._macrosInFocus = macros;

        this._emphasizeMacrosFromFocusedReqt();

        return this;
    }

    private _emphasizeMacrosFromFocusedReqt(): void {
        if (this._collectionInFocus == null) {
            for (let child of this._content.children()) {
                if (!(child instanceof MacroCollectionControl))
                    continue;

                if (this._collectionInFocus == null) {
                    child.setMacrosInFocus(null);
                }
            }
            return;
        }

        for (let child of this._content.children()) {
            if (!(child instanceof MacroCollectionControl))
                continue;

            if (child.getCollection() != this._collectionInFocus)
                child.setMacrosInFocus([]);
            else
                child.setMacrosInFocus(this._macrosInFocus);
        }
    }

    private async _onClick(): Promise<void> {
        let numOfSends = Telemetry.getNumberOfEvents(TelemetryEvent.HttpRequestSent);
        let numOfFeedbacks = Telemetry.getNumberOfEvents(TelemetryEvent.FeedbackSent);
        let mumOfAsksForFeedback = Telemetry.getNumberOfEvents(TelemetryEvent.AskedForFeedback);

        if (mumOfAsksForFeedback > 0 || numOfFeedbacks > 0 || numOfSends < 200) return;

        Telemetry.reportEvent(TelemetryEvent.AskedForFeedback);
        let openFeedback = await Toast.show(new FeedbackToastContent(), 30);

        if (!openFeedback) return;
        openFileInDefaultApp("https://forms.gle/CMN15fRycYADAAbT6");
        Telemetry.reportEvent(TelemetryEvent.FeedbackSent);
    }
}

MacrosControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _header: {
        padding: "5px 15px",
        ...FontStyles.sansSerifBold,
        fontSize: "12px",
        lineHeight: "25px",
        color: Colors.workspaceDescriptor,
        flex: "0 0 35px"
    },
    _content: {
        flex: "1 1 100px",
        overflowX: "auto"
    }
};
