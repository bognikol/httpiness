import { HttpUrl, IReadOnlyMacroContext, MacroedText, MacroedTextPartType } from "../../lib/http";
import { SimpleEvent } from "../../lib/SimpleEvent";

import { TokenTextEditor, Line, AccentToken, RegularToken, ParameterToken, Token } from "../TokenTextEditor";
import { CaretPosition } from "../IKeyboardNavigable";
import { CurlCommandConverter } from "../../lib/interop/requests/CurlCommandConverter";

export enum UrlTextEditorMode { SingleLine, MultiLine }

export class UrlTextEditor extends TokenTextEditor {
    public eventSendRequested: string = "sendRequested";
    public eventCurlCommandPasted: string = "curlCommandPasted";

    private _numberOfQueryLines: number = 0;
    private _mode: UrlTextEditorMode = UrlTextEditorMode.MultiLine;
    private _currentUrl: HttpUrl;

    private _macros: Array<string> = [];
    private _macroContext: IReadOnlyMacroContext = null;

    constructor() {
        super();
        this.setSpaceInsertionAllowed(false)
            .on(this.eventKeyDown, e => this._onEnterDown(e));
    }

    setEditorMode(mode: UrlTextEditorMode): this {
        if (this._mode == mode) return this;

        this._mode = mode;
        this._redraw();
        return this;
    }

    getEditorMode(): UrlTextEditorMode {
        return this._mode;
    }

    getUrl(): HttpUrl {
        return HttpUrl.parse(this.getText());
    }

    getNumberOfQueryLines(): number {
        return this._numberOfQueryLines;
    }

    getMacroNames(): Array<string> {
        return this._macros;
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

    protected _tokenize(newText: string): Array<Line> {
        this._macros = [];

        let lines: Array<Line> = [];
        let tokens: Array<Token> = [];

        const append = (newTokens: Array<Token>, transparent: boolean = false): void => {
            if (this._mode == UrlTextEditorMode.SingleLine) {
                if (transparent) {
                    newTokens.forEach(token => token.setInlineCss({
                        opacity: "0.5"
                    }));
                }
                tokens = tokens.concat(newTokens);
            } else {
                let line = new Line().setTokens(newTokens);
                if (transparent) {
                    line.setInlineCss({
                        opacity: "0.5"
                    });
                }
                lines.push(line);
            }
        };

        try {
            const url = HttpUrl.parse(newText);
            this._currentUrl = url;

            if (url.protocol) {
                if (url.protocol.endsWith("/")) {
                    append([ ...this._tokenizeMacroedText(url.protocol.substring(0, url.protocol.length - 2))[0], new AccentToken("//") ]);
                } else {
                    append(this._tokenizeMacroedText(url.protocol)[0]);
                }
            }

            if (url.hostname) {
                append(this._tokenizeMacroedText(url.hostname)[0]);
            }

            if (url.path) {
                append([ new AccentToken("/"), ...this._tokenizeMacroedText(url.path.substring(1))[0] ]);
            }

            if (url.query) {
                const strippedQuery = url.query.substring(1).split("&");

                this._numberOfQueryLines = strippedQuery.length;

                strippedQuery.map((keyValuePair, index) => {
                    let toks = this._tokenizeMacroedText(keyValuePair);

                    if (index == 0)
                        append([ new AccentToken("?"), ...(toks[0]) ], toks[1]);
                    else
                        append([ new AccentToken("&"), ...(toks[0]) ], toks[1]);
                });
            }

            if (url.hash) {
                append([ new AccentToken("#"), ...this._tokenizeMacroedText(url.hash.substring(1))[0] ]);
            }

        } catch (ex) {
            this._currentUrl = new HttpUrl();
            this._currentUrl.hostname = newText;
            return [ new Line().setTokens(this._tokenizeMacroedText(newText)[0]) ];
        }

        if (this._mode == UrlTextEditorMode.MultiLine) {
            return lines;
        } else {
            lines = [ new Line().setTokens(tokens) ];
            return lines;
        }
    }

    protected _toStringCaretPosition(lines: Array<Line>, position: CaretPosition): number {
        if (lines.length == 0)
            return 0;

        const focusLine = lines[position.row];

        if (position.column >= focusLine.length && focusLine.index != lines.length - 1)
            return lines[position.row + 1].offset;

        return lines[position.row].offset + position.column;
    }

    protected _toTokenCaretPosition(lines: Array<Line>, position: number): CaretPosition {
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

    protected _onLeavingDom(): void {
        if (this._macroContext == null) return;
        this._macroContext.off(this._macroContext.eventMacroValueChanged, this._onMacroChanged);
    }

    protected _onAboutPaste(pasteText: string): boolean {
        let request = CurlCommandConverter.convert(pasteText);

        if (request != null) {
            this.raise(this.eventCurlCommandPasted, { request });
            return false;
        }

        return true;
    }

    private _onMacroChanged = (e: SimpleEvent): void => {
        let macroName = <string>(e["detail"]["macroName"]);
        if (this._macros.indexOf(macroName) != -1) {
            this._redraw();
        }
    };

    private _onEnterDown(e): void {
        if ((<KeyboardEvent>e).key != "Enter") return;
        this.raise(this.eventSendRequested);
    }

    private _tokenizeMacroedText(text: string): [Array<Token>, boolean] {
        let result = MacroedText.parse(text, true);

        let eqPassed = false;
        let isEqInTheEnd = false;
        result.getMacroNames().forEach(name => {
            if (this._macros.indexOf(name) == -1) {
                this._macros.push(name);
            }
        });

        let tokens = result.getParts().map((part) => {
            if (part.type == MacroedTextPartType.Parameter) {
                let macroName = "";

                if (part.text.length >= 3)
                    macroName = part.text.substring(2, part.text.length - 1);

                if (eqPassed && isEqInTheEnd && this._macroContext != null) {
                    isEqInTheEnd = this._macroContext.isMacroEmpty(macroName);
                }
                return new ParameterToken(part.text);
            } else if (part.type == MacroedTextPartType.PlainText) {
                if (eqPassed) isEqInTheEnd = false;
                return new RegularToken(part.text);
            } else if (part.type == MacroedTextPartType.EqualityChar) {
                eqPassed = true;
                isEqInTheEnd = true;
                return new AccentToken(part.text);
            } else
                throw new Error(`MacroedTextPartType ${part.type} is not supported.`);
        });
        return [tokens, isEqInTheEnd];
    }
}
