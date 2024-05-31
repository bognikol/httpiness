import { Element as AflonElement, isAflonElement, Div, Span, AflonHtmlElement, AbstractTextBox } from "aflon";

import { Platform, currentPlatform } from "../../lib/Platform";
import { SimpleEvent } from "../../lib/SimpleEvent";
import { Clipboard } from "../../lib/Clipboard";

import { Colors, FontStyles } from "../StyleConstants";
import { ContextMenu, ContextMenuItemType } from "../ContextMenu";
import { FocusLeaveDirection, CaretPosition, IKeyboardNavigable } from "../IKeyboardNavigable";

import { StringProcessor, StringProcessorState, StringProcessorDelta, StringProcessorDeltaType } from "./StringProcessor";
import { Token, RegularToken } from "./Token";
import { Line } from "./Line";

export class SelectionInterval {
    public start: CaretPosition = null;
    public end: CaretPosition = null;
}

export class TokenTextEditor extends Div implements AbstractTextBox, IKeyboardNavigable {
    public eventChange = "change";
    public eventInput = "input";
    public eventFocusLeaveRequested = "focusLeaveRequested";

    private _clipboardOperationsAllowed: boolean = true;
    private _newLineInsertionAllowed:    boolean = false;
    private _spaceInsertionAllowed:      boolean = true;
    private _tabKeyInsertionString:      string  = null;

    private _placeholder: string = "";
    private _placeholderShown: boolean = false;
    private _placeholderSpan: Span = null;

    private _readOnly: boolean = false;
    private _disabled: boolean = false;

    private _textOnFocusIn: string = "";

    private _currentText: string = "";
    private _textFilter: (text: string) => string = null;

    private _contextMenu: ContextMenu = null;

    constructor() {
        super();

        this.addAttr("contenteditable", "true")
            .addAttr("spellcheck", "false")
            .addAttr("tabindex", "0")
            .setInlineCss({ userSelect: "text" })
            .on(this.eventKeyDown, e => this._onKeyDown(e))
            .on(this.eventFocusIn, () => this._onFocusIn())
            .on(this.eventFocusOut, () => this._onFocusOut());

        (this._contextMenu = new ContextMenu(this, [
            { id: "cut", type: ContextMenuItemType.Button, text: "Cut" },
            { id: "copy", type: ContextMenuItemType.Button, text: "Copy" },
            { id: "paste", type: ContextMenuItemType.Button, text: "Paste" }
        ]))
            .on(this._contextMenu.eventAboutToBeShown, () => this._onContextMenuAboutToBeShown())
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e));

        this._placeholderSpan = new Span();
    }

    setClipboardOperationsAllowed(allowed: boolean): this {
        this._clipboardOperationsAllowed = allowed;
        return this;
    }

    getClipboardOperationsAllowed(): boolean {
        return this._clipboardOperationsAllowed;
    }

    setNewLineInsertionAllowed(allowed: boolean): this {
        this._newLineInsertionAllowed = allowed;
        return this;
    }

    getNewLineInsertionAllowed(): boolean {
        return this._newLineInsertionAllowed;
    }

    setSpaceInsertionAllowed(allowed: boolean): this {
        this._spaceInsertionAllowed = allowed;
        return this;
    }

    getSpaceInsertionAllowed(): boolean {
        return this._spaceInsertionAllowed;
    }

    setTabKeyInsertionString(value: string): this {
        this._tabKeyInsertionString = value;
        return this;
    }

    getTabKeyInsertionString(): string {
        return this._tabKeyInsertionString;
    }

    setText(text: string): this {
        if (this._textFilter != null)
            this._currentText = this._textFilter(text);
        else
            this._currentText = text;

        let tokens = this._tokenize(this._currentText);
        this._populate(tokens);

        this._showPlaceholderIfNecessary();

        setTimeout(() => this.raise(this.eventInput), 1);
        return this;
    }

    getText(): string {
        if (this._placeholderShown) return "";
        return this._currentText;
    }

    setTextFilter(textFilter: (text: string) => string): this {
        this._textFilter = textFilter;
        return this;
    }

    getTextFilter(): (text: string) => string {
        return this._textFilter;
    }

    setPlaceholder(placeholder: string): this {
        this._placeholder = placeholder;
        this._showPlaceholderIfNecessary();
        return this;
    }

    getPlaceholder(): string {
        return this._placeholder;
    }

    setReadOnly(readOnly: boolean): this {
        return this._setDisabledAndReadOnly(this._disabled, readOnly);
    }

    getReadOnly(): boolean {
        return this._readOnly;
    }

    setDisabled(disabled: boolean): this {
        return this._setDisabledAndReadOnly(disabled, this._readOnly);
    }

    getDisabled(): boolean {
        return this._disabled;
    }

    focus(): void {
        this.getHtmlElement().focus();
    }

    blur(): void {
        this.getHtmlElement().blur();
    }

    getLines(): Array<Line> {
        let lines: Array<Line> = [];
        this.children().forEach(child => {
            if (child instanceof Line)
                lines.push(child);
        });
        return lines;
    }

    getSelection(): SelectionInterval {
        let interval: SelectionInterval = new SelectionInterval();

        let selection = document.getSelection();

        if (!selection) return null;

        if (selection.type == "None")
            return null;

        if (selection.rangeCount != 1) return null;

        let range = selection.getRangeAt(0);

        interval.start = this._findCaretPositionInTextNodeWithOffset(range.startContainer, range.startOffset);
        interval.end = this._findCaretPositionInTextNodeWithOffset(range.endContainer, range.endOffset);

        return interval;
    }

    setSelection(interval: SelectionInterval): this {

        let start = this._findNodeWhichContainsCaretPosition(interval.start);
        let end = this._findNodeWhichContainsCaretPosition(interval.end);

        if (start == null || end == null) return this;

        let range = document.createRange();
        let sel = window.getSelection();
        if (sel == null) return this;
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);

        sel.removeAllRanges();
        sel.addRange(range);

        return this;
    }

    selectAll(): this {
        return this.setSelection({
            start: this._toTokenCaretPosition(this.getLines(), 0),
            end: this._toTokenCaretPosition(this.getLines(), this._currentText.length)
        });
    }

    setCaretPosition(position: CaretPosition): this {
        let pos = this._findNodeWhichContainsCaretPosition(position);
        if (pos == null) {
            this.focus();
            return this;
        }

        let range = document.createRange();
        let sel = window.getSelection();
        if (sel == null) return this;
        range.setStart(pos.node, pos.offset);
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);

        let editorRect = this.getHtmlElement().getBoundingClientRect();
        let rangeRect = range.getBoundingClientRect();
        this.getHtmlElement().scrollTo(
            rangeRect.x - editorRect.x - editorRect.width + this.getHtmlElement().scrollLeft,
            rangeRect.y - editorRect.y - editorRect.height + this.getHtmlElement().scrollTop);

        return this;
    }

    getCaretPosition(): CaretPosition {
        let selection = this.getSelection();

        if (!selection.start || !selection.end) return null;

        if (selection.start.column != selection.end.column ||
            selection.start.row != selection.start.row) return null;

        return selection.start;
    }

    protected _redraw(): void {
        this.setText(this.getText());
    }

    protected _tokenize(text: string): Array<Line> {
        const lineStrings = text.split("\n");

        let lines: Array<Line> = [];

        for (let i = 0; i <= lineStrings.length - 1; i++) {
            lines.push(new Line().setTokens([
                new RegularToken(lineStrings[i])]
            ));
        }

        return lines;
    }

    protected _toStringCaretPosition(lines: Array<Line>, position: CaretPosition): number {
        if (lines.length == 0)
            return 0;

        if (position == null)
            return lines[lines.length - 1].offset + lines[lines.length - 1].length;

        return lines[position.row].offset + position.column + position.row;
    }

    protected _toTokenCaretPosition(lines: Array<Line>, position: number): CaretPosition {
        if (position <= 0) return {
            row: 0, column: 0
        };

        let focusLine: Line = null;

        for (let i = 0; i <= lines.length - 1; i++) {
            const currentLine = lines[i];
            if (currentLine.offset <= position && position <= currentLine.length + currentLine.offset) {
                focusLine = currentLine;
                break;
            }
            position--;
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected _onAboutPaste(pasteText: string): boolean {
        return true;
    }

    private _onContextMenuSelected(e: SimpleEvent): void {
        const id = e["detail"]["id"];
        if (!id) return;

        let key = "";

        if (id == "cut") {
            key = "X";
        } else if (id == "copy") {
            key = "C";
        } else if (id == "paste") {
            key = "V";
        }

        this._onKeyDown(new KeyboardEvent("emulatedKeyboardClipboardEvent", {
            key, ctrlKey: true, metaKey: true
        }));
    }

    private _onContextMenuAboutToBeShown(): void {
        const selection = this.getSelection();


        if (!selection || !selection.start || (!selection.end && selection.start.column != 0 && selection.start.row != 0) ||
            (selection.end && selection.start.column == selection.end.column && selection.start.row == selection.end.row)) {
            this._contextMenu.setItemDisabled("copy", true);
            this._contextMenu.setItemDisabled("cut", true);
        } else {
            this._contextMenu.setItemDisabled("copy", false);

            if (this.getReadOnly())
                this._contextMenu.setItemDisabled("cut", true);
            else
                this._contextMenu.setItemDisabled("cut", false);
        }

        const clipboardText = Clipboard.getText();
        if (!clipboardText || this.getReadOnly()) {
            this._contextMenu.setItemDisabled("paste", true);
        } else {
            this._contextMenu.setItemDisabled("paste", false);
        }
    }

    private _setDisabledAndReadOnly(disabled: boolean, readOnly: boolean): this {
        this._disabled = disabled;
        this._readOnly = readOnly;

        if (this._disabled) {
            this.removeAttr("contenteditable")
                .removeAttr("tabindex")
                .addAttr("disabled")
                .removeAttr("readonly")
                .setInlineCss({
                    pointerEvents: "none"
                });
        } else if (this._readOnly) {
            this.removeAttr("contenteditable")
                .removeAttr("tabindex")
                .removeAttr("disabled")
                .addAttr("readonly")
                .setInlineCss({
                    pointerEvents: "auto"
                });
        } else {
            this.addAttr("contenteditable", "true")
                .addAttr("tabindex", "0")
                .removeAttr("disabled")
                .removeAttr("readonly")
                .setInlineCss({
                    pointerEvents: "auto"
                });
        }

        return this;
    }

    private _calculateNewEditorStateOnKeyPress(e: KeyboardEvent, currentState: StringProcessorState) : StringProcessorState {
        const key = e.key;
        const modifierKeyPressed = (currentPlatform() == Platform.MacOS && e.metaKey) ||
                                   (currentPlatform() != Platform.MacOS && e.ctrlKey);

        let delta: StringProcessorDelta = new StringProcessorDelta();

        if (modifierKeyPressed) {
            if (this._clipboardOperationsAllowed) {
                if      (key.toUpperCase() == "C") delta.type = StringProcessorDeltaType.Copy;
                else if (key.toUpperCase() == "V") delta.type = StringProcessorDeltaType.Paste;
                else if (key.toUpperCase() == "X") delta.type = StringProcessorDeltaType.Cut;

                delta.skipNewlinesFromClipboard = !this._newLineInsertionAllowed;
            }
        } else {
            if (key == "Backspace") delta.type = StringProcessorDeltaType.Backspace;
            else if (key == "Delete") delta.type = StringProcessorDeltaType.Delete;
            else if (key == "Enter") {
                if (this._newLineInsertionAllowed) {
                    delta.type = StringProcessorDeltaType.Insert;
                    delta.insertionText = "\n";
                }
            } else if (key == " ") {
                if (this._spaceInsertionAllowed) {
                    delta.type = StringProcessorDeltaType.Insert;
                    delta.insertionText = " ";
                }
            } else if (key == "Tab") {
                if (this._tabKeyInsertionString != null) {
                    delta.type = StringProcessorDeltaType.Insert;
                    delta.insertionText = this._tabKeyInsertionString;
                }
            } else if (key.length == 1) {
                delta.type = StringProcessorDeltaType.Insert;
                delta.insertionText = key;
            }
        }

        if (delta.type == StringProcessorDeltaType.None) return null;

        return StringProcessor.process(currentState, delta);
    }

    private _findCaretPositionInTextNodeWithOffset(container: Node, offset: number): CaretPosition {

        let textNode: Text = null;
        let tokenNode: Token = null;
        let lineNode: Line = null;
        let tokenTextEditorNode: TokenTextEditor = null;

        if (container.nodeType == Node.TEXT_NODE) {
            textNode = <Text>container;

            let textParent: AflonElement = null;
            if (isAflonElement(textNode.parentNode["aflonElement"])) {
                textParent = <AflonElement>((<AflonHtmlElement>textNode.parentNode).aflonElement);

                if (textParent instanceof Token) {
                    tokenNode = <Token>textParent;

                    if (tokenNode.parent() instanceof Line) {
                        lineNode = <Line>tokenNode.parent();

                        if (lineNode.parent() instanceof TokenTextEditor)
                            tokenTextEditorNode = <TokenTextEditor>lineNode.parent();
                    }
                }
            }

        } else if (isAflonElement(container["aflonElement"])) {
            let elem: AflonElement = <AflonElement>((<AflonHtmlElement>container).aflonElement);

            if (elem instanceof Token) {
                tokenNode = <Token>elem;

                if (tokenNode.parent() instanceof Line) {
                    lineNode = <Line>tokenNode.parent();

                    if (lineNode.parent() instanceof TokenTextEditor)
                        tokenTextEditorNode = <TokenTextEditor>lineNode.parent();
                }
            } else if (elem instanceof Line) {
                lineNode = <Line>elem;

                if (lineNode.parent() instanceof TokenTextEditor)
                    tokenTextEditorNode = <TokenTextEditor>lineNode.parent();
            } else if (elem instanceof TokenTextEditor) {
                tokenTextEditorNode = <TokenTextEditor>elem;
            }
        }

        if (tokenTextEditorNode == null || tokenTextEditorNode != this) return null;

        if (lineNode == null) return { row: 0, column: 0 };

        if (tokenNode == null) {
            if (offset == 0) return {
                row: lineNode.index,
                column: 0
            };
            else if (offset == lineNode.getChildrenNumber()) return {
                row: lineNode.index,
                column: lineNode.length
            };
            else return {
                row: lineNode.index,
                column: lineNode.getTokens()[offset - 1].offset + lineNode.getTokens()[offset - 1].length
            };
        }

        if (textNode == null) return { row: 0, column: 0 };

        return {
            row: lineNode.index,
            column: tokenNode.offset + offset
        };
    }

    private _findNodeWhichContainsCaretPosition(position: CaretPosition): { node: Node, offset: number } {
        let lines = this.getLines();

        if (lines.length == 0) return null;

        if (position.row == -1 || position.row > lines.length - 1)
            position.row = lines.length - 1;

        if (position.row < 0)
            position.row = 0;

        const targetLine = lines[position.row];

        if (position.column == -1 || position.column > targetLine.length)
            position.column = targetLine.length;

        if (position.column < 0)
            position.column = 0;

        if (position.column == 0 && targetLine.length == 0)
            return { node: targetLine.getHtmlElement(), offset: 0 };

        let targetToken: Token = null;
        const targetLineTokens = targetLine.getTokens();

        if (position.column == targetLine.length) {
            targetToken = <Token>(targetLineTokens[targetLineTokens.length - 1]);
        } else {
            for (let i = 0; i <= targetLineTokens.length - 1; i++) {
                const token = <Token>targetLineTokens[i];
                if (token.offset <= position.column && position.column < token.offset + token.length) {
                    targetToken = token;
                    break;
                }
            }
        }

        const targetTokenChildren = targetToken.getHtmlElement().childNodes;

        if (targetTokenChildren.length == 1 &&
            targetTokenChildren[0].nodeType == 3) {
            return { node: <Text>(targetTokenChildren[0]), offset: position.column - targetToken.offset};
        }
        return null;
    }

    private _onKeyDown(e: Event): void {
        let keyEvent = <KeyboardEvent>e;

        this._raiseEventFocusLeaveRequestedIfNecessary(keyEvent);

        if (keyEvent.key == "ArrowUp" ||
            keyEvent.key == "ArrowDown" ||
            keyEvent.key == "ArrowLeft" ||
            keyEvent.key == "ArrowRight")
            return;

        if (keyEvent.key == "Tab" &&
            this._tabKeyInsertionString == null)
            return;

        e.preventDefault();

        const modifierKeyPressed =
            (currentPlatform() == Platform.MacOS && keyEvent.metaKey) ||
            (currentPlatform() != Platform.MacOS && keyEvent.ctrlKey);

        if (keyEvent.key.toUpperCase() == "Z" && modifierKeyPressed) {
            this.setText(this._textOnFocusIn);
            return;
        }

        if (keyEvent.key.toUpperCase() == "V" && modifierKeyPressed) {
            if (!this._onAboutPaste(Clipboard.getText())) return;
        }

        const selectionInterval = this.getSelection();

        if (!selectionInterval) return;

        let currentStringProcessorState = {
            text: this._currentText,
            selection: {
                start: this._toStringCaretPosition(this.getLines(), selectionInterval.start),
                end: this._toStringCaretPosition(this.getLines(), selectionInterval.end)
            }
        };

        let newStringProcessorState =
            this._calculateNewEditorStateOnKeyPress(keyEvent, currentStringProcessorState);

        if (newStringProcessorState == null) return;

        if (newStringProcessorState.text != null && newStringProcessorState.text != this._currentText) {
            this.setText(newStringProcessorState.text);
        }

        if (newStringProcessorState.selection.start != -1)
            this.setCaretPosition(this._toTokenCaretPosition(this.getLines(), newStringProcessorState.selection.start));
    }

    private _raiseEventFocusLeaveRequestedIfNecessary(keyEvent: KeyboardEvent): void {
        let caretPosition = this.getCaretPosition();

        if (!caretPosition) return;

        let lines = this.getLines();
        let key = keyEvent.key;
        let lastColumnLength: number = lines[lines.length - 1]?.length ?? 0;

        let direction: FocusLeaveDirection = null;

        if (caretPosition.row == 0) {
            if (key == "ArrowUp") {
                direction = FocusLeaveDirection.Up;
            } else if (caretPosition.column == 0) {
                if (key == "ArrowLeft") {
                    direction = FocusLeaveDirection.Left;
                } else if (key == "Backspace" && this.getText().length == 0) {
                    direction = FocusLeaveDirection.Backspace;
                }
            }
        }

        if (caretPosition.row == lines.length - 1 || lines.length == 0) {
            if (key == "ArrowDown") {
                direction = FocusLeaveDirection.Down;
            } else if (caretPosition.column == lastColumnLength && key == "ArrowRight") {
                direction = FocusLeaveDirection.Right;
            }
        }

        if (direction) {
            keyEvent.preventDefault();
            this.raise(this.eventFocusLeaveRequested, { direction });
        }
    }

    private _onFocusIn(): void {
        if (this._placeholderShown) {
            this._placeholderShown = false;
            this.empty();
            this._textOnFocusIn = "";
        } else {
            this._textOnFocusIn = this.getHtmlElement().textContent;
        }
    }

    private _onFocusOut(): void {
        this._showPlaceholderIfNecessary();

        if (this.getHtmlElement().textContent != this._textOnFocusIn)
            this.raise(this.eventChange, {}, true);
    }

    private _showPlaceholderIfNecessary(): void {
        if (this._currentText.length == 0) {
            this.empty();
            this.append([
                this._placeholderSpan.setText(this._placeholder)
            ]);
            this._placeholderShown = true;
        } else {
            this._placeholderShown = false;
        }
    }

    private _populate(lines: Array<Line>): this {
        this.empty();

        let offset = 0;
        lines.forEach((line, index) => {
            line.index = index;
            line.offset = offset;
            offset += line.length;
        });

        this.append(lines);
        return this;
    }
}

TokenTextEditor.style = {
    _: {
        minWidth: "20px",
        display: "inline-block",
        color: Colors.workspaceDefault,
        ...FontStyles.monoSpace,
        "&:focus": {
            border: "none",
            outline: "none"
        }
    },
    _placeholderSpan: {
        color: Colors.workspacePlaceholder,
        pointerEvents: "none"
    }
};
