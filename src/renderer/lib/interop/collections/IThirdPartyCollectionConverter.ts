export enum ConversionLogRecordType { Schema, Dir, Request, Warning }

export class ConversionLogRecord {
    type: ConversionLogRecordType;
    message: string;
}

export class ConversionLog extends Array<ConversionLogRecord> {
    schema(schema: string): void {
        this.push({
            type: ConversionLogRecordType.Schema,
            message: schema
        });
    }

    dir(dirName: string): void {
        this.push({
            type: ConversionLogRecordType.Dir,
            message: dirName
        });
    }

    request(requestName: string): void {
        this.push({
            type: ConversionLogRecordType.Request,
            message: requestName
        });
    }

    warn(message: string): void {
        this.push({
            type: ConversionLogRecordType.Warning,
            message
        });
    }

    warnTypeIs(variableName: string, type: string, input: unknown): void {
        this.warn(`Type of ${variableName} is invalid; ${type} expected. Actual value ${input}.`);
    }

    warnTypeIsNot(variableName: string, type: string, input: unknown): void {
        this.warn(`Type of ${variableName} is invalid; must not be ${type}. Actual value ${input}.`);
    }

    toString(): string {
        let result = "";

        this.forEach(record => {
            switch (record.type) {
                case ConversionLogRecordType.Schema:
                    result += "SCH " + record.message + "\n";
                    break;
                case ConversionLogRecordType.Dir:
                    result += "DIR " + record.message + "\n";
                    break;
                case ConversionLogRecordType.Request:
                    result += "REQ " + record.message + "\n";
                    break;
                case ConversionLogRecordType.Warning:
                    result += "    WARNING --> " + record.message + "\n";
                    break;
                default:
                    throw new Error(`ConversionLogRecordType ${record.type} is not implemented.`);
            }
        });

        return result;
    }
}

export enum ConversionError { Success, NoFile, JsonParsing, Unknown }

export enum NotSupported {
    CollectionSchema = "unknown collection schema",
    Digest = "digest authentication",
    OAuth1 = "OAuth1",
    OAuth2Password = "OAuth2 with password grant type",
    OAuth2UnknownGrantType = "OAuth2 unknown grant type",
    Hawk = "hawk authentication",
    NTLM = "NTLM authentication",
    AWSv4 = "AWSv4 authentication",
    EdgeGrid = "AWSv4 authentication",
    AuthOther = "unknown authentication protocol",
    MultiFileFormRecord = "multi-file form record",
    FileContent = "file content stored in collection"
}

export class ConversionResult {
    error: ConversionError;
    notSupported: Set<NotSupported>;
}

export interface IThirdPartyCollectionConverter {
    convert(): ConversionResult;
    save(pathToHttpinessCollection: string, pathToConversionLog: string): boolean;
}
