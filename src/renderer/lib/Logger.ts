
export class ErrorRecord {
    error: Error = null;
}

export function log(message: string): void {
    console.log(message);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function error(message: string, errorRecord: ErrorRecord = null): void {
    console.log(message);
}
