import { Div, TextBox } from "aflon";

import { Icon } from "../Icon";
import { Colors, BoxShadowValues, FontStyles, ZIndexLayers  } from "../StyleConstants";

enum HelpElementType {
    Question = "Question", SectionTitle = "SectionTitle"
}

interface HelpQuestion {
    type: HelpElementType.Question;
    question: string;
    answer: string;
}

interface HelpSectionTitle {
    type: HelpElementType.SectionTitle;
    title: string;
}

type HelpElement = HelpQuestion | HelpSectionTitle;

class HelpElementControl extends Div {

    private _question: Div;
    private _answer: Div;
    private _sectionTitle: Div;

    constructor(element: HelpElement) {
        super();

        if (element.type == HelpElementType.Question) {
            this.append([
                (this._question = new Div())
                    .setText(element.question)
                    .on(this._question.eventClick, () => this._onClick()),
                (this._answer = new Div())
                    .setText(element.answer)
                    .setVisibility(false)
            ]);
        } else if (element.type == HelpElementType.SectionTitle) {
            this.append([
                (this._sectionTitle = new Div())
                    .setText(element.title)
            ]);
        }
    }

    setExpanded(expanded: boolean): this {
        if (this._answer)
            this._answer.setVisibility(expanded);
        return this;
    }

    getExpanded(): boolean {
        if (this._answer)
            return this._answer.getVisibility();
        return false;
    }

    setSearchPhrase(phrase: string): void {
        if (!phrase) {
            this.setVisibility(true);
            return;
        }

        if (this._sectionTitle) {
            this.setVisibility(false);
            return;
        }

        if (this._question.getText().toUpperCase().indexOf(phrase.toUpperCase()) != -1 ||
            this._answer.getText().toUpperCase().indexOf(phrase.toUpperCase()) != -1) {
            this.setVisibility(true);
        } else {
            this.setVisibility(false);
        }
    }

    private _onClick(): void {
        this.setExpanded(!this.getExpanded());
    }
}

HelpElementControl.style = {
    _: {
        ...FontStyles.sansSerifNormal,
        fontSize: "12px",
        color: Colors.workspaceDefault,
        "&:hover": {
            color: Colors.workspaceDescriptor
        }
    },
    _question: {
        cursor: "pointer",
        fontSize: "14px",
        margin: "5px 20px 5px 20px"
    },
    _answer: {
        userSelect: "text",
        margin: "5px 20px 5px 40px",
        lineHeight: "160%"
    },
    _sectionTitle: {
        marginTop: "5px",
        marginBottom: "5px",
        cursor: "pointer",
        ...FontStyles.sansSerifBold,
        textTransform: "uppercase",
        fontSize: "11px",
        letterSpacing: "1px",
        color: Colors.workspaceDescriptor
    }
};

export class InAppHelp extends Div {

    private _header: Div;
    private _title: Div;
    private _closeBtn: Icon;
    private _searchBox: TextBox;
    private _entries: Div;

    constructor() {
        super();

        this.append([
            (this._header = new Div())
                .append([
                    (this._title = new Div())
                        .setText("Help"),
                    (this._closeBtn = new Icon("close"))
                        .on(this._closeBtn.eventClick, () => this._onCloseBtnClick())
                ]),
            (this._searchBox = new TextBox())
                .setPlaceholder("Search...")
                .on(this._searchBox.eventInput, () => this._onSearchBoxInput()),
            (this._entries = new Div())
        ]);

        setTimeout(async () => {
            let elements = await InAppHelp.getHelpContent();
            this._entries.append(elements.map(element => new HelpElementControl(element)));
        }, 0);
    }

    static async getHelpContent(): Promise<Array<HelpElement>> {
        let content = await (await fetch("./resources/faq.txt")).text();

        let sections = content.split(">>section-");

        let result: Array<HelpElement> = [];

        for (let section of sections) {
            if (!section) continue;
            if (section.trim().length == 0) continue;

            let questions = section.split(">>question-");

            for (let i = 0; i <= questions.length - 1; i++) {
                let faq = questions[i];

                if (!faq) continue;
                if (faq.trim().length == 0) continue;

                if (i == 0) {
                    result.push({ type: HelpElementType.SectionTitle, title: faq });
                    continue;
                }

                let [ question, answer ] = faq.split(">>answer-");

                if (!question || !answer) continue;

                question = question.trim();
                answer = answer.trim();

                result.push({ type: HelpElementType.Question, question, answer });
            }
        }

        return result;
    }

    setVisibility(visible: boolean): this {
        super.setVisibility(visible);
        if (visible)
            this._searchBox.focus();
        return this;
    }

    private _onSearchBoxInput(): void {
        this._entries.children().forEach(child => {
            let helpElement = (<HelpElementControl>child);
            helpElement.setSearchPhrase(this._searchBox.getText());
            helpElement.setExpanded(false);
        });
    }

    private async _onCloseBtnClick(): Promise<void> {
        this.setVisibility(false);
    }
}

InAppHelp.style = {
    _: {
        width: "400px",
        height: "80vh",
        background: Colors.consoleBackground,
        borderTop: `solid 1px ${Colors.consoleBorder}`,
        boxShadow: BoxShadowValues.consoleExtended,
        color: Colors.browserDefault,
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "stretch",
        borderRadius: "20px",
        zIndex: ZIndexLayers.modal
    },
    _header: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        margin: "10px 20px 10px 20px"
    },
    _title: {
        color: Colors.workspaceDescriptor,
        fontSize: "12px",
        flex: "1 1 content"
    },
    _closeBtn: {
        fontSize: "12px",
        cursor: "pointer"
    },
    _searchBox: {
        ...FontStyles.sansSerifNormal,
        appearance: "none",
        border: "none",
        height: "25px",
        padding: "0 10px",
        fontSize: "12px",
        borderRadius: "6px",
        marginLeft: "10px",
        marginRight: "10px",
        color: Colors.workspaceDefault,
        "&:focus": {
            outline: "none"
        }
    },
    _entries: {
        flex: "1 1 1px",
        display: "flex",
        flexFlow: "column nowrap",
        overflowY: "scroll",
        padding: "10px 20px",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    }
};
