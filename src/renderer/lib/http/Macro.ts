import { ISimpleEventable } from "../SimpleEvent";

export interface MacroRecord {
    name: string;
    value: string;
}

export interface MacroPreset {
    macros: Array<MacroRecord>;
    name: string;
}

export interface IMacroSource {
    getMacroNames(): Array<string>;
}

export interface IReadOnlyMacroContext extends ISimpleEventable, IMacroSource {
    eventMacroValueChanged: string;

    getMacroValue(name: string): Promise<string>;
    getMacroPublicValue(name: string): string;
    isMacroSensitive(name: string): boolean;
    isMacroEmpty(name: string): boolean;
}

export interface IMacroContext extends IReadOnlyMacroContext {
    setMacro(name: string, value: string, sensitive: boolean): Promise<void>;
    deleteMacro(name: string): this;

    getMacroPresets(): Array<MacroPreset>;
    setMacroPresets(preset: Array<MacroPreset>): Promise<void>;
    applyMacroPreset(presetName: string): this;
}

export enum MacroedTextPartType {
    Parameter, PlainText, EqualityChar
}

export class MacroedTextPart {
    text: string;
    type: MacroedTextPartType;
}

export class MacroedText implements IMacroSource {
    private _parts: Array<MacroedTextPart> = [];

    static parse(text: string, parseEqualityCharacter = false): MacroedText {
        let parametricText = new MacroedText();

        if (!text && text != "") {
            return parametricText;
        }

        if (text == "") {
            parametricText._parts.push({ text: "", type: MacroedTextPartType.PlainText });
            return parametricText;
        }

        let currentPartStartIndex = 0;
        let currentPartType = MacroedTextPartType.PlainText;

        let cm1 = null;    // character at offset -1 from current character
        let c0  = null;    // current character
        let cp1 = text[0]; // character at offset +1 from current character

        for (let i = 0; i <= text.length - 1; i++) {

            cm1 = c0;
            c0  = cp1;
            cp1 = text[i + 1]; // when out of range, empty string is returned

            if (parseEqualityCharacter && currentPartType != MacroedTextPartType.Parameter && c0 == "=") {
                parseEqualityCharacter = false;

                if (currentPartStartIndex != i)
                    parametricText._parts.push({
                        text: text.substring(currentPartStartIndex, i), type: currentPartType
                    });

                parametricText._parts.push({
                    text: "=", type: MacroedTextPartType.EqualityChar
                });

                currentPartStartIndex = i + 1;
                currentPartType = MacroedTextPartType.PlainText;
            } else if (currentPartType != MacroedTextPartType.Parameter &&  c0 == "$" && cp1 == "{") {
                if (currentPartStartIndex != i)
                    parametricText._parts.push({
                        text: text.substring(currentPartStartIndex, i), type: currentPartType
                    });
                currentPartStartIndex = i;
                currentPartType = MacroedTextPartType.Parameter;
            } else if (currentPartType == MacroedTextPartType.Parameter && c0 == "}" && cm1 != "\\") {

                parametricText._parts.push({
                    text: text.substring(currentPartStartIndex, i + 1), type: currentPartType
                });

                currentPartStartIndex = i + 1;
                currentPartType = MacroedTextPartType.PlainText;
            }
        }

        if (currentPartStartIndex <= text.length - 1) {
            parametricText._parts.push({
                text: text.substring(currentPartStartIndex), type: currentPartType
            });
        }

        return parametricText;
    }

    getParts(): Array<MacroedTextPart> {
        return this._parts;
    }

    getMacroNames(): Array<string> {
        let macroNames: Array<string> = [];

        this._parts
            .filter(part => part.type == MacroedTextPartType.Parameter && part.text.length >= 3)
            .forEach(part => {
                if (part.text[part.text.length - 1] == "}")
                    macroNames.push(part.text.substring(2, part.text.length - 1));
                else
                    macroNames.push(part.text.substring(2));
            });

        return macroNames;
    }
}
