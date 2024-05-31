import { Clipboard } from "../../lib/Clipboard";

export class StringSelection {
    start: number = -1;
    end: number = -1;
}

export class StringProcessorState {
    text: string;
    selection: StringSelection = new StringSelection();
}

export enum StringProcessorDeltaType {
    None, Backspace, Delete, Insert, Copy, Cut, Paste
}

export class StringProcessorDelta {
    type: StringProcessorDeltaType = StringProcessorDeltaType.None;
    insertionText: string;
    skipNewlinesFromClipboard: boolean = false;
}

export class StringProcessor {
    public static process(state: StringProcessorState, delta: StringProcessorDelta): StringProcessorState {

        if (delta.type == StringProcessorDeltaType.Insert)
            return StringProcessor._processCharacter(state, delta.insertionText);
        else if (delta.type == StringProcessorDeltaType.Backspace)
            return StringProcessor._processBackspace(state);
        else if (delta.type == StringProcessorDeltaType.Delete)
            return StringProcessor._processDelete(state);
        else if (delta.type == StringProcessorDeltaType.Cut)
            return StringProcessor._processCut(state);
        else if (delta.type == StringProcessorDeltaType.Copy)
            return StringProcessor._processCopy(state);
        else if (delta.type == StringProcessorDeltaType.Paste)
            return StringProcessor._processPaste(state, delta.skipNewlinesFromClipboard);

        return null;
    }

    private static _processCopy(currentState: StringProcessorState): StringProcessorState {
        if (currentState.selection.start == currentState.selection.end) return null;
        const selectedText = currentState.text.substring(currentState.selection.start, currentState.selection.end);
        if (!selectedText) return null;
        Clipboard.setText(selectedText);
        return null;
    }

    private static _processPaste(currentState: StringProcessorState, skipNewLines: boolean): StringProcessorState {
        let clipboardText = Clipboard.getText();
        if (skipNewLines)
            clipboardText = clipboardText.split("\n").join("");

        if (!clipboardText) return null;

        let newState = new StringProcessorState();

        if (currentState.selection.start  == currentState.selection.end) {
            newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.start, clipboardText);
            newState.selection = { start: currentState.selection.start + clipboardText.length, end: currentState.selection.start + clipboardText.length };
        } else {
            newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.end, clipboardText);
            newState.selection = { start: currentState.selection.start + clipboardText.length, end: currentState.selection.start + clipboardText.length };
        }

        return newState;
    }

    private static _processCut(currentState: StringProcessorState): StringProcessorState {
        if (currentState.selection.start == currentState.selection.end) return null;

        const selectedText = currentState.text.substring(currentState.selection.start, currentState.selection.end);
        if (!selectedText) return null;
        Clipboard.setText(selectedText);

        let newState = new StringProcessorState();

        newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.end, "");
        newState.selection = { start: currentState.selection.start, end: currentState.selection.start };

        return newState;
    }

    private static _processBackspace(currentState: StringProcessorState): StringProcessorState {
        let newState = new StringProcessorState();

        if (currentState.selection.start == currentState.selection.end) {
            if (currentState.selection.start >= 1) {
                newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start - 1, currentState.selection.start, "");
                newState.selection.start = currentState.selection.start - 1;
                newState.selection.end = currentState.selection.start - 1;
            }
        } else {
            newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.end, "");
            newState.selection.start = currentState.selection.start;
            newState.selection.end = currentState.selection.start;
        }

        return newState;
    }

    private static _processDelete(currentState: StringProcessorState): StringProcessorState {
        let newState = new StringProcessorState();

        if (currentState.selection.start == currentState.selection.end) {
            if (currentState.selection.start < currentState.text.length) {
                newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.start + 1, "");
                newState.selection.start = currentState.selection.start;
                newState.selection.end = currentState.selection.start;
            }
        } else {
            newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.end, "");
            newState.selection.start = currentState.selection.start;
            newState.selection.end = currentState.selection.start;
        }

        return newState;
    }

    private static _processCharacter(currentState: StringProcessorState, character: string): StringProcessorState {
        let newState = new StringProcessorState();

        if (currentState.selection.start  == currentState.selection.end) {
            newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.end, character);
            newState.selection.start = currentState.selection.start + character.length;
            newState.selection.end = currentState.selection.start + character.length;
        } else {
            newState.text = StringProcessor._modifyString(currentState.text, currentState.selection.start, currentState.selection.end, character);
            newState.selection.start = currentState.selection.start + character.length;
            newState.selection.end = currentState.selection.start + character.length;
        }

        return newState;
    }

    private static _modifyString(originalString: string, from: number, to: number, replaceString: string): string {
        return originalString.substring(0, from) + replaceString + originalString.substring(to);
    }
}
