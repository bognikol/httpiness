import { Div } from "aflon";

import { HttpExecution, HttpReqt } from "../../../lib/http";

import { Colors, FontStyles, getShortMethodDesignation } from "../../StyleConstants";
import { Icon } from "../../Icon";
import { Tooltip } from "../../ContextMenu";

import { RequestExecutionStatus } from "../RequestExecutionStatus";
import { ResponsePanelOptionsButton } from "../ResponsePanelOptionsButton";

export class HttpStatusAndMetadataControl extends Div {
    eventSearchActivationRequested: string = "searchActivationRequested";
    eventHistoryRequested: string = "historyRequested";

    private _row1: Div;
    private _methodDescriptor: Div;
    private _requestName: Div;
    private _arrow: Div;
    private _icon: Icon;
    private _statusUp: RequestExecutionStatus;
    private _buffer: Div;
    private _headerSearchButton: Div;
    private _headerOptionsButton: ResponsePanelOptionsButton;


    private _row2: Div;
    private _statusDown: RequestExecutionStatus;
    private _metadata: Div;
    private _metadataRow2: Div;
    private _metadataRow1: Div;

    private _expanded: boolean = true;
    private _reqt: HttpReqt = null;
    private _execution: HttpExecution = null;

    constructor() {
        super();

        this.append([
            (this._row1 = new Div())
                .setVisibility(false)
                .append([
                    (this._methodDescriptor = new Div())
                        .on(this._methodDescriptor.eventClick, () => this.raise(this.eventHistoryRequested)),
                    (this._requestName = new Div())
                        .on(this._methodDescriptor.eventClick, () => this.raise(this.eventHistoryRequested)),
                    (this._arrow = new Div())
                        .on(this._methodDescriptor.eventClick, () => this.raise(this.eventHistoryRequested))
                        .append([ this._icon = new Icon("result") ]),
                    (this._statusUp = new RequestExecutionStatus())
                        .on(this._methodDescriptor.eventClick, () => this.raise(this.eventHistoryRequested)),
                    (this._buffer = new Div()),
                    (this._headerOptionsButton = new ResponsePanelOptionsButton())
                        .setVisibility(false),
                    (this._headerSearchButton = new Div())
                        .append([ new Icon("search") ])
                        .setVisibility(false)
                        .on(this._headerSearchButton.eventClick, () => this.raise(this.eventSearchActivationRequested))
                ]),
            (this._row2 = new Div())
                .setVisibility(false)
                .append([
                    (this._statusDown = new RequestExecutionStatus()),
                    (this._metadata = new Div())
                        .append([
                            (this._metadataRow1 = new Div()),
                            (this._metadataRow2 = new Div())
                        ])
                ])
        ]);

        new Tooltip(this._headerSearchButton).setText("Search response");

        this.setExecution(null, null);
    }

    setExpanded(expanded: boolean): this {
        this._expanded = expanded;
        this.setExecution(this._reqt, this._execution);
        return this;
    }

    getExpanded(): boolean {
        return this._row1.getVisibility();
    }

    setExecution(reqt: HttpReqt, httpExecution: HttpExecution): this {
        this._reqt = reqt;
        this._execution = httpExecution;

        if (reqt == null) {
            this._row1.setVisibility(false);
            this._row2.setVisibility(false);

            return this;
        }

        let name = reqt.getName();
        let method = reqt.getRawHttpRequest().method;

        if (!httpExecution) {
            this._row1.setVisibility(this._expanded);
            this._headerSearchButton.setVisibility(false);
            this._headerOptionsButton.setVisibility(false);
            this._row2.setVisibility(false);
            this._statusDown.setVisibility(!this._expanded);
            this._statusUp.setStatus(0);
            this._statusDown.setStatus(0);
            this._methodDescriptor.setText(getShortMethodDesignation(method));
            this._requestName.setText(name);
            return this;
        }

        this._row1.setVisibility(this._expanded);
        this._row2.setVisibility(true);
        this._statusDown.setVisibility(!this._expanded);
        this._methodDescriptor.setText(getShortMethodDesignation(method));
        this._requestName.setText(name);
        this._headerSearchButton.setVisibility(true);
        this._headerOptionsButton.setVisibility(true);

        let { response, metadata } = httpExecution;

        if (metadata.errorMessage) {
            this._metadataRow1.setText("There was an error.");
            this._metadataRow2.setText(metadata.errorMessage);
            this._statusUp.setStatus(-1);
            this._statusDown.setStatus(-1);
            return this;
        }

        if (response) {
            this._statusUp.setStatus(httpExecution.response.status);
            this._statusDown.setStatus(httpExecution.response.status);
        }

        this._metadataRow1.empty();

        if (metadata.localIp && metadata.localPort && metadata.remoteIp && metadata.remotePort) {
            this._metadataRow1.append([
                new Div().setText(`${metadata.localIp}:${metadata.localPort}`),
                new Icon("sync").setInlineCss({ padding: "0 5px" }),
                new Div().setText(`${metadata.remoteIp}:${metadata.remotePort}`)
            ]);
        }

        if (!isNaN(metadata.executionTimeInSeconds) &&
            !isNaN(metadata.downloadSizeInBytes) &&
            !isNaN(metadata.uploadSizeInBytes)) {
            this._metadataRow1.append([
                new Icon("timer").setInlineCss({ padding: "0 5px 0 10px", fontSize: "10px" }),
                new Div().setText(`${Math.round(metadata.executionTimeInSeconds * 1000)} MS`),
                new Icon("upload").setInlineCss({ padding: "0 5px 0 10px" }),
                new Div().setText(`${Math.ceil(metadata.uploadSizeInBytes / 1024) / 10} KB`),
                new Icon("download").setInlineCss({ padding: "0 5px 0 10px" }),
                new Div().setText(`${Math.ceil(metadata.downloadSizeInBytes / 1024) / 10} KB`)
            ]);
        }

        this._metadataRow2.setText(`HTTP/${metadata.httpVersion} @ ${metadata.timestamp.toLocaleString()}`);

        return this;
    }
}

HttpStatusAndMetadataControl.style = {
    _: {
        display: "flex",
        flexFlow: "column nowrap"
    },
    _row1: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        color: Colors.browserDefault,
        padding: "0 0 0 10px",
        flex: "0 0 36px",
        borderBottom: `1px solid ${Colors.workspaceLine}`,
        overflowX: "scroll",
        overflowY: "hidden",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _methodDescriptor: {
        ...FontStyles.sansSerifExtraBold,
        fontSize: "12px",
        width: "35px",
        textAlign: "left",
        cursor: "pointer"
    },
    _requestName: {
        ...FontStyles.sansSerifNormal,
        fontSize: "13px",
        maxWidth: "200px",
        minWidth: "0px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        cursor: "pointer"
    },
    _arrow: {
        padding: "4px",
        borderRadius: "4px",
        fontSize: "13px",
        marginLeft: "10px",
        marginRight: "10px",
        cursor: "pointer"
    },
    _statusUp: {
        marginRight: "10px",
        cursor: "pointer"
    },
    _headerSearchButton: {
        display: "flex",
        fontSize: "15px",
        alignContent: "center",
        alignItems: "center",
        height: "100%",
        width: "30px",
        paddingLeft: "2px",
        paddingTop: "2px",
        textAlign: "center",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _headerOptionsButton: {
        height: "100%",
        width: "30px"
    },
    _buffer: {
        flex: "1 1 1px"
    },
    _row2: {
        flex: "0 0 40px",
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "stretch",
        borderBottom: `1px solid ${Colors.workspaceLine}`,
        overflowX: "scroll",
        overflowY: "hidden",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _statusDown: {
        paddingLeft: "30px",
        paddingRight: "30px",
        borderRight: `1px solid ${Colors.workspaceLine}`
    },
    _metadata: {
        display: "flex",
        flexFlow: "column nowrap",
        justifyContent: "center",
        paddingLeft: "10px",
        height: "100%",
        ...FontStyles.sansSerifNormal,
        color: Colors.workspaceDefault,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        fontSize: "10px"
    },
    _metadataRow1: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        whiteSpace: "nowrap"
    },
    _metadataRow2: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        whiteSpace: "nowrap"
    }
};
