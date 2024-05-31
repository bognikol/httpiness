import * as aflon from "aflon";

import { SimpleEvent } from "../lib/SimpleEvent";
import { ContextMenu, ContextMenuItemType, ContextMenuShowTrigger } from "./ContextMenu";

import { BoxShadowValues, Colors, FontStyles } from "./StyleConstants";

export class Button extends aflon.Button { }

Button.style = {
    _: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDescriptor,
        background: Colors.workspaceLine,
        appearance: "none",
        border: "none",
        outline: "none",
        fontSize: "12px",
        minWidth: "80px",
        height: "25px",
        borderRadius: "4px",
        textAlign: "center",
        paddingLeft: "20px",
        paddingRight: "20px",
        letterSpacing: "0.5px",
        boxShadow: BoxShadowValues.button,
        borderBottom: `0.5px solid ${Colors.workspacePlaceholder}`,
        cursor: "pointer",
        whiteSpace: "nowrap",
        "&:focus": {
            border: `1px solid ${Colors.workspacePlaceholder}`
        },
        "&:hover": {
            background: Colors.workspacePlaceholder
        }
    }
};

export class SelectBox extends aflon.Div implements aflon.AbstractSelectBox {
    eventSelected: string = "selected";
    eventChange: string = "change";
    eventInput: string = "input";

    private _contextMenu: ContextMenu;

    private _options: Array<aflon.ISelectOption> = [];
    private _selectedValue: string = null;

    constructor() {
        super();

        this.addAttr("tabindex", "0");

        (this._contextMenu = new ContextMenu(this, [], ContextMenuShowTrigger.OnClickEvent))
            .on(this._contextMenu.eventAboutToBeShown, () => this._onContextMenuAboutToBeShown())
            .on(this._contextMenu.eventSelected, e => this._onContextMenuSelected(e));
    }

    insertOption(option: aflon.ISelectOption): this {
        let entry = this._options.find(opt => option.value == opt.value);

        if (entry) {
            entry.text = option.text;
            return this;
        }

        this._options.push({ ...option });

        if (!this._selectedValue && this._options.length > 0)
            this.setSelectedOption(this._options[0].value);
        return this;
    }

    removeOption(optionValue: string): this {
        let removeIndex = this._options.findIndex(elem => elem.value == optionValue);
        if (removeIndex == -1) return this;

        this._options = this._options.splice(removeIndex, 1);
        return this;
    }

    insertOptions(options: aflon.ISelectOption[]): this {
        options.forEach(opt =>  {
            let entry = this._options.find(opt2 => opt2.value == opt.value);

            if (entry) {
                entry.text = opt.text;
                return;
            }

            this._options.push({ ...opt });
        });

        if (!this._selectedValue && this._options.length > 0)
            this.setSelectedOption(this._options[0].value);

        return this;
    }

    setSelectedOption(optionValue: string): this {
        if (this._selectedValue == optionValue) return this;

        let entry = this._options.find(opt2 => opt2.value == optionValue);
        if (!entry) return this;

        this._selectedValue = entry.value;
        this.setText(entry.text);

        return this;
    }

    getSelectedOption(): aflon.ISelectOption {
        let selected = this._options.find(opt2 => opt2.value == this._selectedValue);
        return selected;
    }

    getAllOptions(): Array<aflon.ISelectOption> {
        return [ ...this._options ];
    }

    setDisabled(disabled: boolean): this {
        if (disabled) {
            this.addAttr("disabled");
            this.removeAttr("tabindex");
        } else {
            this.removeAttr("disabled");
            this.addAttr("tabindex");
        }

        return this;
    }

    getDisabled(): boolean {
        return this.hasAttr("disabled");
    }

    focus(): void {
        this.getHtmlElement().focus();
    }

    blur(): void {
        this.getHtmlElement().blur();
    }

    private _onContextMenuAboutToBeShown(): void {
        this._contextMenu.setDefinition(
            this._options.map(option => ({
                type: ContextMenuItemType.Button,
                text: option.text,
                id: option.value })
            )
        );
    }

    private _onContextMenuSelected(e: SimpleEvent): void {
        let entry = this._options.find(opt2 => opt2.value == e.detail["id"]);
        if (!entry) return;

        let selectedValue = <string>e.detail["id"];

        if (selectedValue == this._selectedValue) return;

        this.setSelectedOption(<string>e.detail["id"]);

        this.raise(this.eventSelected);
        this.raise(this.eventInput);
        this.raise(this.eventChange);
    }
}

SelectBox.style = {
    _: {
        ...FontStyles.sansSerifBold,
        color: Colors.workspaceDefault,
        appearance: "none",
        border: "none",
        background: "none",
        cursor: "pointer",
        textDecoration: "underline",
        fontSize: "12px",
        display: "inline-block",
        whiteSpace: "nowrap",
        "&:focus": {
            border: "none",
            outline: "none"
        }
    }
};
