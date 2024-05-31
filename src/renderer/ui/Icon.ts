import { Span } from "aflon";

export class Icon extends Span {
    private _name: string;

    constructor(iconName: string) {
        super();
        this.setName(iconName);
    }

    getName(): string {
        return this._name;
    }

    setName(iconName: string): this {
        this.removeClass(`ri-${this._name}`);
        this._name = iconName;
        this.addClass(`ri-${this._name}`);
        return this;
    }
}
