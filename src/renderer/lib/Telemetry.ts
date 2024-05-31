import { RapidsWebApi } from "./RapidsWebApi";
import { Environment } from "./Environment";


export enum TelemetryEvent {
    HttpRequestSent  = "HttpRequestSent",
    FeedbackSent     = "FeedbackSent",
    IssueReported    = "IssueReported",
    AskedForFeedback = "AskedForFeedback",
    HeartBeatSent    = "HeartBeatSent"
}

class TelemetryStorageKeys {
    static counterKey       = (event: TelemetryEvent): string => `evt_${event}_ctr;`;
    static lastTimestampKey = (event: TelemetryEvent): string => `evt_${event}_ltmst`;
}

class TelemetryImpl {
    reportEvent(event: TelemetryEvent): void {
        setTimeout(() => {
            this._updateEventStats(event);

            switch (event) {
                case TelemetryEvent.HttpRequestSent: this._onHttpRequestSent(); break;
            }
        }, 0);
    }

    getNumberOfEvents(event: TelemetryEvent): number {
        let currentNumLCValue = localStorage.getItem(TelemetryStorageKeys.counterKey(event));

        if (!currentNumLCValue) return 0;

        let numValue = Number.parseInt(currentNumLCValue);
        if (Number.isNaN(numValue)) return 0;

        return numValue;
    }

    getLastEventTimestamp(event: TelemetryEvent): Date {
        let dateString = localStorage.getItem(TelemetryStorageKeys.lastTimestampKey(event));
        if (!dateString) return null;

        let timestamp = Date.parse(dateString);
        if (isNaN(timestamp)) return null;

        return new Date(timestamp);
    }

    private _reportHeartBeatIfNecessary(): void {
        if (Environment.isDefined("DO_NOT_SEND_TELEMETRY")) return;

        let currentTimeStamp = new Date();
        let lastHeartBeatTimeStamp = this.getLastEventTimestamp(TelemetryEvent.HeartBeatSent);

        if (lastHeartBeatTimeStamp &&
            currentTimeStamp.getTime() - lastHeartBeatTimeStamp.getTime() < 24 * 60 * 60 * 1000)
            return;

        if (!RapidsWebApi.reportHeartBeat()) return;
        this.reportEvent(TelemetryEvent.HeartBeatSent);
    }

    private _onHttpRequestSent(): void {
        this._reportHeartBeatIfNecessary();
    }

    private _updateEventStats(event: TelemetryEvent): void {
        let counterKey = TelemetryStorageKeys.counterKey(event);
        let ltmstKey = TelemetryStorageKeys.lastTimestampKey(event);

        localStorage.setItem(ltmstKey, new Date().toISOString());

        let currentNumLCValue = localStorage.getItem(counterKey);
        if (!currentNumLCValue) {
            localStorage.setItem(counterKey, "1");
            return;
        }

        let currentParsedNum = Number.parseInt(currentNumLCValue);
        if (Number.isNaN(currentParsedNum)) {
            localStorage.setItem(counterKey, "1");
            return;
        }

        localStorage.setItem(counterKey, String(currentParsedNum + 1));
    }
}

export const Telemetry = new TelemetryImpl();
