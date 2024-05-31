import { IMacroSource, MacroedText, MacroedTextPartType } from "../../lib/http";

import { TokenTextEditor } from "./TokenTextEditor";
import { Line } from "./Line";
import { Token, RegularToken, ParameterToken } from "./Token";

export class MacroedTextEditor extends TokenTextEditor implements IMacroSource {
    private _macros: Array<string> = [];

    constructor() {
        super();

        this.setPlaceholder("...");
    }

    getMacroNames(): Array<string> {
        return this._macros;
    }

    protected _tokenize(newText: string): Array<Line> {
        this._macros = [];
        return [ new Line().setTokens(this._tokenizeMacroedText(newText)) ];
    }

    private _tokenizeMacroedText(text: string): Array<Token> {
        let result = MacroedText.parse(text);
        this._macros = result.getMacroNames();
        return result.getParts().map(part => {
            if (part.type == MacroedTextPartType.Parameter) {
                return new ParameterToken(part.text);
            } else if (part.type == MacroedTextPartType.PlainText) return new RegularToken(part.text);
            else throw new Error(`MacroedTextPartType ${part.type} is not supported.`);
        });
    }
}
