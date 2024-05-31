import { CSS } from "aflon";

import { Colors } from "../StyleConstants";
import { Line, ParameterToken, TokenTextEditor } from "../TokenTextEditor";


export class MacroNameTextBox extends TokenTextEditor {

    constructor() {
        super();

        this.setPlaceholder("Enter parameter name");
    }

    protected _tokenize(text: string): Array<Line> {
        return [ new Line().setTokens([ new ParameterToken(text) ]) ];
    }
}

MacroNameTextBox.style = CSS.extendAflonCss(TokenTextEditor.style, {
    _: {
        width: "100%",
        height: "30px",
        lineHeight: "29px",
        color: Colors.workspaceParameter,
        paddingLeft: "8px",
        overflowX: "scroll",
        borderBottom: `1px solid ${Colors.workspaceLineWeak}`,
        borderLeft: `1px solid ${Colors.workspaceLineWeak}`,
        "&:focus": {
            border: "none",
            outline: "none",
            borderBottom: `1px solid ${Colors.workspaceLineWeak}`,
            borderLeft: `1px solid ${Colors.workspaceLineWeak}`
        },
        "&::-webkit-scrollbar": {
            display: "none"
        }
    }
});
