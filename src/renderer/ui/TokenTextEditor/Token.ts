import { Span, CSS } from "aflon";

import { Colors } from "../StyleConstants";

export class Token extends Span {
    private static _noWrapClass: string = CSS.class({
        whiteSpace: "pre"
    });

    public offset: number;
    public readonly length: number;

    constructor(text: string, wrapLine: boolean = false) {
        super();

        this.setText(text);
        this.length = text.length;

        if (!wrapLine) {
            this.addClass(Token._noWrapClass);
        }
    }
}

export class RegularToken extends Token {
    private static _cssColorClass = CSS.class({
        color: Colors.workspaceDefault
    });

    constructor(text: string, wrapLine: boolean = false) {
        super(text, wrapLine);

        this.addClass(RegularToken._cssColorClass);
    }
}

export class AccentToken extends Token {
    private static _cssColorClass = CSS.class({
        color: Colors.workspaceAccent
    });

    constructor(text: string, wrapLine: boolean = false) {
        super(text, wrapLine);

        this.addClass(AccentToken._cssColorClass);
    }
}

export class ParameterToken extends Token {
    private static _cssColorClass = CSS.class({
        color: Colors.workspaceParameter
    });

    constructor(text: string, wrapLine: boolean = false) {
        super(text, wrapLine);

        this.addClass(ParameterToken._cssColorClass);
    }
}

export class SuppressedToken extends Token {
    private static _cssColorClass = CSS.class({
        color: Colors.workspacePlaceholder
    });

    constructor(text: string, wrapLine: boolean = false) {
        super(text, wrapLine);

        this.addClass(SuppressedToken._cssColorClass);
    }
}
