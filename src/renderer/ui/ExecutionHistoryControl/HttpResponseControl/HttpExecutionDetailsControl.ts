import { Div } from "aflon";
import { HttpExecutionMetadata } from "../../../lib/http";

import { Colors, FontStyles } from "../../StyleConstants";

export class HttpExecutionDetailsControl extends Div {

    private _executionDetailsText: Div;

    private _executionMetadata: HttpExecutionMetadata;

    constructor() {
        super();

        this.append([
            (this._executionDetailsText = new Div())
        ]);
    }

    setExecutionMetadata(metadata: HttpExecutionMetadata): this {
        this._executionMetadata = metadata;
        this._executionDetailsText.empty();

        if (!this._executionMetadata) return this;

        const meta = this._executionMetadata;

        if (meta.errorMessage) {
            this._executionDetailsText.append([
                new Div().setText("There was an error."),
                new Div().setText(meta.errorMessage)
            ]);
            return this;
        }

        this._executionDetailsText.append([
            new Div().setText(`@ ${meta.timestamp.toLocaleString()}`)
        ]);

        if (meta.localIp && meta.localPort && meta.remoteIp && meta.remotePort) {
            this._executionDetailsText.append([
                new Div().setText(`${meta.localIp}:${meta.localPort} <--> ${meta.remoteIp}:${meta.remotePort}`)
            ]);
        }

        if (!isNaN(meta.executionTimeInSeconds) &&
            !isNaN(meta.downloadSizeInBytes) &&
            !isNaN(meta.downloadSizeInBytes) &&
            !isNaN(meta.uploadSizeInBytes)) {
            this._executionDetailsText.append([
                new Div().setText(`Duration ${Math.round(meta.executionTimeInSeconds * 1000)} ms, download ${Math.ceil(meta.downloadSizeInBytes / 1024) / 10} KB, upload ${Math.ceil(meta.uploadSizeInBytes / 1024) / 10} KB`)
            ]);
        }

        this._executionDetailsText.append([
            new Div().setText(`Protocol http/${meta.httpVersion}`)
        ]);

        return this;
    }

    getExecutionMetadata(): HttpExecutionMetadata {
        return this._executionMetadata;
    }
}

HttpExecutionDetailsControl.style = {
    _: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault
    }
};
