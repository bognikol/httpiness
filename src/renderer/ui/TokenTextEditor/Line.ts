import { Element, Span } from "aflon";

import { Token } from "./Token";

class Br extends Element {
    _createElement(): HTMLElement {
        return document.createElement("br");
    }
}

export class Line extends Span {
    public index: number;
    public length: number;
    public offset: number;

    getTokens(): Array<Token> {
        return this.children()
            .filter(child => child instanceof Token)
            .map(child => <Token>child);
    }

    setTokens(tokens: Array<Token>): this {
        let offset = 0;

        let nonEmptyTokens = [];

        tokens.forEach((token) => {
            if (token.length == 0) return;
            nonEmptyTokens.push(token);
            token.offset = offset;
            offset += token.length;
        });


        this.length = offset;

        this.empty();
        this.append(nonEmptyTokens);
        this.append([ new Br() ]);
        return this;
    }
}

Line.style = {
    _: {
        height: "20px",
        whiteSpace: "nowrap"
    }
};
