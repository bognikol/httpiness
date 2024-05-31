import { Div, typeAflonTarget } from "aflon";

import { TokenTextEditor } from "../TokenTextEditor";
import { Colors } from "../StyleConstants";
import { SimpleModals } from "../Modals";

import { MacroNameTextBox } from "./MacroNameTextBox";

export class MacroNamesControl extends Div {
    public eventChange = "change";

    private _header: Div;
    private _names: Div;

    constructor() {
        super();

        this.append([
            (this._header = new Div()),
            (this._names = new Div())
                .append([ this._createNewNameTokenTextEditor("") ])
        ]);
    }

    setNames(names: Array<string>): this {
        this._names.empty();

        this._names.append(
            names.map(name => this._createNewNameTokenTextEditor(name))
        );

        this._names.append([ this._createNewNameTokenTextEditor("") ]);

        return this;
    }

    getNames(): Array<string> {
        let result = this._names.children()
            .filter(child => child instanceof MacroNameTextBox)
            .map(child => child.getText());

        result.pop();

        return result;
    }

    private _createNewNameTokenTextEditor(name: string): TokenTextEditor {
        let editor = new MacroNameTextBox();

        editor
            .setText(name)
            .on(editor.eventInput, () => this._onEditorInput())
            .on(editor.eventFocusOut, e => this._onFocusOut(e));

        return editor;
    }

    private _onEditorInput(): void {
        let children = this._names.children();
        if (children.length != 0) {
            let lastChild = children[children.length - 1];
            if (lastChild.getText().length != 0)
                this._names.append([ this._createNewNameTokenTextEditor("") ]);
        }
        this.raise(this.eventChange);
    }

    private async _onFocusOut(e: Event): Promise<void> {
        let sender = typeAflonTarget(e, TokenTextEditor);

        if (!sender) return;

        if (sender == this._names.children()[this._names.children().length - 1]) return;

        if (this.getNames().filter(name => name == sender.getText()).length > 1) {
            await SimpleModals.alert(`Parameter ${sender.getText()} is already configured.`);
            setTimeout(() => sender.focus(), 0);
            return;
        }

        if (sender.getText().length != 0) return;

        this._names.removeChild(sender);
        this.raise(this.eventChange);
    }
}

MacroNamesControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _header: {
        height: "30px",
        borderBottom: `1px solid ${Colors.workspaceLineWeak}`
    },
    _names: {
        display: "flex",
        flexFlow: "column nowrap"
    }
};
