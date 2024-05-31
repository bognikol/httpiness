import { Div } from "aflon";

import { HttpExecutor, HttpExecution, HttpReqt } from "../../../lib/http";
import { Telemetry, TelemetryEvent } from "../../../lib/Telemetry";

import { Colors, FontStyles, getShortMethodDesignation } from "../../StyleConstants";
import { Icon } from "../../Icon";
import { Tooltip } from "../../ContextMenu";

import { RequestExecutionStatus } from "../RequestExecutionStatus";

export class RequestExecutionItemControl extends Div {
    public eventSelected = "selected";
    public eventResponseReady = "responseReady";
    public eventReexecutionRequested = "reexecutionRequested";

    private _methodDescriptor: Div;
    private _requestName: Div;
    private _arrow: Div;
    private _icon: Icon;
    private _result: RequestExecutionStatus;

    private _selected: boolean = false;
    private _reqt: HttpReqt;
    private _execution: HttpExecution = null;

    constructor(reqt: HttpReqt) {
        super();

        this._reqt = reqt;

        this.append([
            (this._methodDescriptor = new Div())
                .setText(getShortMethodDesignation(this._reqt.getRawHttpRequest().method)),
            (this._requestName = new Div())
                .setText(this._reqt.getName()),
            (this._arrow = new Div())
                .append([ this._icon = new Icon("result") ]),
            (this._result = new RequestExecutionStatus())
                .setTextShown(false)
        ])
            .on(this.eventClick, () => this._onClick());

        setTimeout(() => this._initiateRequest(), 0);
    }

    getReqt(): HttpReqt {
        return this._reqt;
    }

    getExecution(): HttpExecution {
        return this._execution;
    }

    setSelected(selected: boolean): this {
        if (this._selected == selected)
            return this;

        this._selected = selected;

        if (this._selected) {
            this.setInlineCss({ background: Colors.browserBackSelected });
            this.raise(this.eventSelected);
        } else {
            this.setInlineCss({ background: "none" });
        }

        return this;
    }

    getSelected(): boolean {
        return this._selected;
    }

    private _onClick(): void {
        this.setSelected(true);
    }

    private async _initiateRequest(): Promise<void> {
        let request = await this._reqt.getHttpRequest();

        this._execution = await HttpExecutor.execute(request);

        if (this._execution.response) {
            this._result.setStatus(this._execution.response.status);
        } else {
            this._result.setStatus(-1);
        }

        this.on(this.eventMouseEnter, () => this._onMouseEnter())
            .on(this.eventMouseLeave, () => this._onMouseLeave());

        this._arrow
            .on(this._arrow.eventMouseEnter, () => this._onArrowMouseEnter())
            .on(this._arrow.eventMouseLeave, () => this._onArrowMouseLeave())
            .on(this._arrow.eventClick, () => this._onArrowClick());

        new Tooltip(this._arrow).setText("Send request again");

        Telemetry.reportEvent(TelemetryEvent.HttpRequestSent);

        this.raise(this.eventResponseReady);
    }

    private _onMouseEnter(): void {
        this._icon.setName("restart");
    }

    private _onMouseLeave(): void {
        this._icon.setName("result");
    }

    private _onArrowMouseEnter(): void {
        this._arrow.setInlineCss({
            backgroundColor: Colors.browserBackHover
        });
    }

    private _onArrowMouseLeave(): void {
        this._arrow.setInlineCss({
            background: "none"
        });
    }

    private _onArrowClick(): void {
        this.raise(this.eventReexecutionRequested, {
            reqt: this._reqt
        });
    }
}

RequestExecutionItemControl.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        color: Colors.browserDefault,
        height: "30px",
        cursor: "pointer",
        "&:hover": {
            background: Colors.browserBackHover
        }
    },
    _methodDescriptor: {
        ...FontStyles.sansSerifExtraBold,
        fontSize: "11px",
        width: "40px",
        textAlign: "center"
    },
    _requestName: {
        ...FontStyles.sansSerifNormal,
        fontSize: "12px",
        flex: "1 1 1px",
        minWidth: "0px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
    },
    _arrow: {
        padding: "4px",
        borderRadius: "4px",
        fontSize: "14px"
    },
    _result: {
        marginLeft: "5px",
        marginRight: "10px",
        height: "18px",
        width: "30px"
    }
};
