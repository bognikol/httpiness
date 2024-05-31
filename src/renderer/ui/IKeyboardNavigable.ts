export enum FocusLeaveDirection {
    Up = "Up", Down = "Down", Left = "Left", Right = "Right", Backspace = "Backspace"
}

export class CaretPosition {
    row: number = -1;
    column: number = -1;
}

export interface IKeyboardNavigable {
    eventFocusLeaveRequested: string;

    setCaretPosition(position: CaretPosition): this;
    getCaretPosition(): CaretPosition;
}
