import { Div } from "aflon";

import { Colors, FontStyles, getStatusColor } from "../StyleConstants";

class Dot extends Div {}

Dot.style = {
    _:{
        width: "6px",
        height: "6px",
        borderRadius: "3px",
        opacity: "none",
        background: Colors.browserDefault
    }
};

class WaitingLoader extends Div {
    constructor() {
        super();

        this.append([ new Dot(), new Dot(), new Dot() ]);
    }
}

WaitingLoader.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        justifyContent: "space-evenly"
    }
};

const STATUS_CODE_DESCRIPTION_DICT: Record<number, string> = {
    100: "Continue",
    101: "Switching Protocols",
    102: "Processing",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    207: "Multi-Status",
    208: "Already Reported",
    226: "IM Used",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    444: "Connection Closed Without Response",
    451: "Unavailable For Legal Reasons",
    499: "Client Closed Request",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required",
    599: "Network Connect Timeout Error"
};

function getStatusDescription(status: number): string {
    if (status in STATUS_CODE_DESCRIPTION_DICT)
        return STATUS_CODE_DESCRIPTION_DICT[status];

    return "";
}

export class RequestExecutionStatus extends Div {
    private _waiting: Div;
    private _error: Div;
    private _result: Div;
    private _statusText: Div;

    private _showText: boolean = true;
    private _animate: boolean = true;

    private _currentStatus: number = 0;

    constructor() {
        super();

        this.append([
            (this._waiting = new WaitingLoader()),
            (this._error = new Div()),
            (this._result = new Div()),
            (this._statusText = new Div())
        ]);
    }

    setTextShown(shown: boolean): this {
        this._showText = shown;
        return this;
    }

    getTextShown(): boolean {
        return this._showText;
    }

    setStatus(status: number): this {
        if (this._currentStatus == status) return this;

        this.animations("showError").stop();
        this.animations("showResult").stop();
        this.animations("showWaiting").stop();

        if (status == 0) {
            this.animations("showWaiting").toEnd();
        } else if (status == -1) {
            if (this._currentStatus == 0)
                this.animations("showError").start();
            else
                this.animations("showError").toEnd();
        } else {
            this._result
                .setText(status.toString())
                .setInlineCss({
                    background: getStatusColor(status)
                });

            this._statusText.setText(getStatusDescription(status));

            if (this._showText) {
                if (this._currentStatus == 0)
                    this.animations("showResultWithStatusText").start();
                else
                    this.animations("showResultWithStatusText").toEnd();
            } else {
                if (this._currentStatus == 0)
                    this.animations("showResult").start();
                else
                    this.animations("showResult").toEnd();
            }
        }

        this._currentStatus = status;

        return this;
    }

    getStatus(): number {
        return this._currentStatus;
    }
}

RequestExecutionStatus.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        justifyContent: "center"
    },
    _waiting: {
        flex: "0 0 30px"
    },
    _error: {
        width: "20px",
        height: "18px",
        display: "none",
        backgroundImage: "url(./resources/images/StatusError.png)",
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat"
    },
    _result: {
        ...FontStyles.monoSpace,
        fontSize: "13px",
        lineHeight: "18px",
        width: "30px",
        height: "18px",
        borderRadius: "6px",
        color: "rgba(255, 255, 255, 0)",
        textAlign: "center"
    },
    _statusText: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        marginLeft: "10px",
        lineHeight: "14px",
        whiteSpace: "nowrap",
        display: "none",
        opacity: "0"
    }
};

RequestExecutionStatus.animations = {
    showResult: {
        animations: [
            { track: "width", from: "0px", to: "30px", target: "_result" },
            { track: "marginLeft", from: "15px", to: "0px", target: "_result" },
            { track: "height", from: "0px", to: "18px", target: "_result" },
            { track: "color", to: "rgba(255, 255, 255, 1)", target: "_result", delay: 300 },
            { track: "display", to: "none", target: "_statusText" },
            { track: "opacity", to: 0, target: "_statusText" },
            { track: "display", to: "block", target: "_result" },
            { track: "display", to: "none", target: "_waiting" },
            { track: "display", to: "none", target: "_error" }
        ],
        ease: "circOut"
    },
    showResultWithStatusText: {
        animations: [
            { track: "width", from: "0px", to: "30px", target: "_result" },
            { track: "marginLeft", from: "15px", to: "0px", target: "_result" },
            { track: "height", from: "0px", to: "18px", target: "_result" },
            { track: "color", from: "rgba(255, 255, 255, 0)", to: "rgba(255, 255, 255, 1)", target: "_result", delay: 300 },
            { track: "display", to: "block", target: "_statusText" },
            { track: "opacity", from: 0, to: 1, target: "_statusText", delay: 300 },
            { track: "display", to: "block", target: "_result" },
            { track: "display", to: "none", target: "_waiting" },
            { track: "display", to: "none", target: "_error" }
        ],
        ease: "circOut"
    },
    showError: {
        animations: [
            { track: "color", to: "rgba(255, 255, 255, 0)", target: "_result", duration: 1 },
            { track: "display", to: "none", target: "_statusText" },
            { track: "opacity", to: 0, target: "_statusText", duration: 0 },
            { track: "display", to: "none", target: "_result" },
            { track: "display", to: "none", target: "_waiting" },
            { track: "display", to: "block", target: "_error" }
        ]
    },
    showWaiting: {
        animations: [
            { track: "color", to: "rgba(255, 255, 255, 0)", target: "_result", duration: 1 },
            { track: "display", to: "none", target: "_statusText" },
            { track: "opacity", to: 0, target: "_statusText", duration: 0 },
            { track: "display", to: "none", target: "_result" },
            { track: "display", to: "flex", target: "_waiting" },
            { track: "display", to: "none", target: "_error" }
        ]
    }
};
