import { Div, typeAflonTarget } from "aflon";
import { HttpReqt } from "../../../lib/http";
import { RequestExecutionItemControl } from "./RequestExecutionItemControl";


export class RequestExecutionHistoryControl extends Div {
    eventExecutionSelected: string = "executionSelected";

    private _selectedREControl: RequestExecutionItemControl = null;

    push(reqt: HttpReqt): this {
        let requestExeControl = new RequestExecutionItemControl(reqt);
        requestExeControl
            .on(requestExeControl.eventSelected, e => this._onRequestSelected(e))
            .on(requestExeControl.eventResponseReady, e => this._onResponseReady(e))
            .on(requestExeControl.eventReexecutionRequested, e => this._onReexecutionRequested(e));

        this.prepend([ requestExeControl ]);

        requestExeControl.setSelected(true);

        return this;
    }

    clear(): void {
        this.children().forEach(child => {
            if (!(child instanceof RequestExecutionItemControl)) return;

            let requestExeControl = <RequestExecutionItemControl>(child);
            requestExeControl
                .off(requestExeControl.eventSelected, e => this._onRequestSelected(e))
                .off(requestExeControl.eventResponseReady, e => this._onResponseReady(e))
                .off(requestExeControl.eventReexecutionRequested, e => this._onReexecutionRequested(e));

        });

        this.raise(this.eventExecutionSelected, {
            reqt: null,
            execution: null
        });

        this.empty();
    }

    private _onRequestSelected(e): void {
        if (this._selectedREControl != null)
            this._selectedREControl.setSelected(false);

        this._selectedREControl = typeAflonTarget(e, RequestExecutionItemControl);

        this.raise(this.eventExecutionSelected, {
            reqt: this._selectedREControl.getReqt(),
            execution: this._selectedREControl.getExecution()
        });
    }

    private _onResponseReady(e): void {
        let reControl = typeAflonTarget(e, RequestExecutionItemControl);

        let lastControl = this.children().find(control => control instanceof RequestExecutionItemControl);

        if (reControl != lastControl) return;

        if (this._selectedREControl != reControl)
            reControl.setSelected(true);
        else
            this.raise(this.eventExecutionSelected, {
                reqt: this._selectedREControl.getReqt(),
                execution: this._selectedREControl.getExecution()
            });
    }

    private _onReexecutionRequested(e): void {
        setTimeout(() => this.push(e["detail"]["reqt"]), 0);
    }
}

RequestExecutionHistoryControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap",
        overflowX: "scroll"
    }
};
