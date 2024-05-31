/* eslint-disable no-fallthrough */
import { IMacroSource, IReadOnlyMacroContext, MacroedText, MacroedTextPartType } from "../../../lib/http";
import { SimpleEvent } from "../../../lib/SimpleEvent";
import { TokenTextEditor, Line, Token, RegularToken, ParameterToken, AccentToken } from "../../TokenTextEditor";
import { CaretPosition } from "../../IKeyboardNavigable";

export enum TextFormatting {
    Plain, URLQuery
}

export class BodyTextEditor extends TokenTextEditor implements IMacroSource {
    private _formatting: TextFormatting = TextFormatting.Plain;
    private _wrapLines: boolean = false;

    private _macroContext: IReadOnlyMacroContext = null;
    private _macros: Array<string> = [];

    constructor(wrapLines: boolean = false) {
        super();
        this.setNewLineInsertionAllowed(true)
            .setTabKeyInsertionString("  ");

        this._wrapLines = wrapLines;
    }

    setFormatting(formatting: TextFormatting): this {
        if (this._formatting == formatting) return this;

        this._formatting = formatting;
        this._redraw();

        return this;
    }

    getFormatting(): TextFormatting {
        return this._formatting;
    }

    setMacroContext(macroContext: IReadOnlyMacroContext): this {
        if (this._macroContext != null)
            this._macroContext.off(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
        this._macroContext = macroContext;
        this._macroContext.on(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
        this._redraw();
        return this;
    }

    getMacroContext(): IReadOnlyMacroContext {
        return this._macroContext;
    }

    getMacroNames(): Array<string> {
        return this._macros;
    }

    protected _onLeavingDom(): void {
        if (this._macroContext == null) return;
        this._macroContext.off(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
    }

    protected _toStringCaretPosition(lines: Array<Line>, position: CaretPosition): number {
        if (this._formatting != TextFormatting.URLQuery)
            return super._toStringCaretPosition(lines, position);

        if (lines.length == 0)
            return 0;

        const focusLine = lines[position.row];

        if (position.column >= focusLine.length && focusLine.index != lines.length - 1)
            return lines[position.row + 1].offset;

        return lines[position.row].offset + position.column;
    }

    protected _toTokenCaretPosition(lines: Array<Line>, position: number): CaretPosition {
        if (this._formatting != TextFormatting.URLQuery)
            return super._toTokenCaretPosition(lines, position);

        if (position <= 0 || lines.length == 0) return {
            row: 0, column: 0
        };

        let focusLine: Line = null;

        for (let i = 0; i <= lines.length - 1; i++) {
            const currentLine = lines[i];
            if (currentLine.offset <= position && position <= currentLine.length + currentLine.offset) {
                focusLine = currentLine;
                break;
            }
        }

        if (focusLine == null)
            return {
                row: lines.length - 1,
                column: lines[lines.length - 1].length
            };

        return {
            row: focusLine.index,
            column: position - focusLine.offset
        };
    }

    protected _tokenize(newText: string): Array<Line> {
        switch (this._formatting) {
            case TextFormatting.Plain: return this._tokenizePlain(newText);
            case TextFormatting.URLQuery: return this._tokenizeURLEncoding(newText);
            default:
                throw new Error(`Text formatting ${this._formatting} is not supported.`);
        }
    }

    private _tokenizePlain(newText: string): Array<Line> {
        const lineStrings = newText.split("\n");

        let macros: Array<string> = [];
        let lines: Array<Line> = [];

        for (let i = 0; i <= lineStrings.length - 1; i++) {
            let macroedText = MacroedText.parse(lineStrings[i]);

            macroedText.getMacroNames().forEach(name => {
                if (macros.indexOf(name) == -1)
                    macros.push(name);
            });

            lines.push(new Line().setTokens(
                macroedText.getParts().map(part => {
                    if (part.type == MacroedTextPartType.Parameter) return new ParameterToken(part.text);
                    else if (part.type == MacroedTextPartType.PlainText) return new RegularToken(part.text);
                    else throw new Error(`MacroedTextPartType ${part.type} is not supported.`);
                })
            ));
        }

        this._macros = macros;

        return lines;
    }

    private _tokenizeURLEncoding(newText: string): Array<Line> {
        let lines: Array<Line> = [];

        let macros: Array<string> = [];

        let keyValues = newText.split("&");

        for (let i = 0; i <= keyValues.length - 1; i++) {
            let macroedText = MacroedText.parse(keyValues[i], true);

            macroedText.getMacroNames().forEach(name => {
                if (macros.indexOf(name) == -1)
                    macros.push(name);
            });

            this._macros = macroedText.getMacroNames();


            let eqPassed = false;
            let isEqInTheEnd = false;

            let tokens: Array<Token> = [];

            if (i != 0)
                tokens.push(new AccentToken("&"));

            for (let part of macroedText.getParts()) {
                if (part.type == MacroedTextPartType.Parameter) {
                    let macroName = "";

                    if (part.text.length >= 3)
                        macroName = part.text.substring(2, part.text.length - 1);

                    if (eqPassed && isEqInTheEnd && this._macroContext != null)
                        isEqInTheEnd = this._macroContext.isMacroEmpty(macroName);

                    tokens.push(new ParameterToken(part.text));
                } else if (part.type == MacroedTextPartType.PlainText) {
                    if (eqPassed) isEqInTheEnd = false;
                    tokens.push(new RegularToken(part.text));
                } else if (part.type == MacroedTextPartType.EqualityChar) {
                    eqPassed = true;
                    isEqInTheEnd = true;
                    tokens.push(new AccentToken(part.text));
                } else
                    throw new Error(`MacroedTextPartType ${part.type} is not supported.`);
            }

            lines.push(
                new Line()
                    .setTokens(tokens)
                    .setInlineCss({
                        opacity: isEqInTheEnd ? "0.5" : "1.0"
                    }));
        }

        this._macros = macros;

        return lines;
    }

    private _onMacroChanged = (e: SimpleEvent): void => {
        if (this._formatting != TextFormatting.URLQuery) return;

        let macroName = <string>(e["detail"]["macroName"]);
        if (this._macros.includes(macroName)) {
            this._redraw();
        }
    };
}
