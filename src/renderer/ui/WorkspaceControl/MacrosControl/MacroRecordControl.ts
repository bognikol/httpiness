import { AbstractTextBox, Div, PassBox, Span } from "aflon";

import { HttpCollection } from "../../../lib/http";
import { SimpleEvent } from "../../../lib/SimpleEvent";

import { Tooltip } from "../../ContextMenu";
import { SimpleModals } from "../../Modals";
import { Icon } from "../../Icon";
import { Colors, FontStyles } from "../../StyleConstants";
import { TokenTextEditor } from "../../TokenTextEditor";

export class MacroRecordControl extends Div {
    private static _defaultSensitiveText = "sensitive";

    private _collection: HttpCollection;
    private _inPreview: boolean = false;

    private _name: Div;
    private _nameText: Span;
    private _value: AbstractTextBox;
    private _sensitiveValue: PassBox;
    private _preview: Div;
    private _lock: Div;

    private _nameTooltip: Tooltip;
    private _lockTooltip: Tooltip;
    private _previewTooltip: Tooltip;

    constructor(collection: HttpCollection, name: string, maxNameWidth: number = 0) {
        super();

        this._collection = collection;
        this._collection.on(this._collection.eventMacroValueChanged, this._onMacroValueChanged);

        this
            .on(this.eventMouseEnter, () => this._onMouseEnter())
            .on(this.eventMouseLeave, () => this._onMouseLeave())
            .append([
                (this._name = new Div())
                    .append([
                        (this._nameText = new Span())
                            .setText(name)
                    ]),
                (this._value = new TokenTextEditor())
                    .setPlaceholder("Enter parameter value")
                    .on(this._value.eventInput, () => this._onValueInput()),
                (this._sensitiveValue = new PassBox())
                    .setText(MacroRecordControl._defaultSensitiveText)
                    .on(this._sensitiveValue.eventFocusIn, () => this._onSensitiveValueFocusIn())
                    .on(this._sensitiveValue.eventFocusOut, () => this._onSensitiveFocusOut())
                    .on(this._value.eventChange, () => this._onSensitiveValueChange()),
                (this._preview = new Div())
                    .setVisibility(false)
                    .on(this.eventClick, () => this._onPreviewClick())
                    .append([
                        new Icon("eye")
                    ]),
                (this._lock = new Div())
                    .setVisibility(false)
                    .on(this.eventClick, () => this._onLockClick())
                    .append([
                        new Icon("lock")
                    ])
            ]);

        if (maxNameWidth != 0)
            this._name.setInlineCss({
                flex: `0 0 ${maxNameWidth}px`
            });

        if (!this._collection.isMacroSensitive(name)) {
            this._value
                .setVisibility(true)
                .setText(this._collection.getMacroPublicValue(name));
            this._sensitiveValue.setVisibility(false);
        } else {
            this._value.setVisibility(false);
            this._sensitiveValue.setVisibility(true);
            this._lock
                .setVisibility(true)
                .setInlineCss({ borderStyle: "solid" });
        }

        this._lockTooltip = new Tooltip(this._lock)
            .setTitle("Toggle parameter lock")
            .setText("When parameter is locked it will be persisted in system's default credential \
             store and will not be saved in collection JSON file. Use this option to protect sensitive \
             data like passwords and secret tokens.");
        this._nameTooltip = new Tooltip(this._name).setText(name);
        this._previewTooltip = new Tooltip(this._preview).setText("Preview locked value");
    }

    getMacroName(): string {
        return this._nameText.getText();
    }

    protected _onLeavingDom(): void {
        if (this._inPreview) {
            this._inPreview = false;
            this._lockMacro();
        }
        this._collection.off(this._collection.eventMacroValueChanged, this._onMacroValueChanged);
    }

    private async _lockMacro(): Promise<void> {
        this._sensitiveValue.setVisibility(true);
        this._value
            .setVisibility(false)
            .setText("");

        await this._collection.setMacro(this._nameText.getText(), null, true);
    }

    private async _unlockMacro(): Promise<void> {
        let name = this._nameText.getText();

        this._value
            .setText(await this._collection.getMacroValue(name))
            .setVisibility(true);

        this._sensitiveValue.setVisibility(false);

        await this._collection.setMacro(name, null, false);
    }

    private async _onValueInput(): Promise<void> {
        if (this._sensitiveValue.getVisibility()) return;
        await this._collection.setMacro(this._nameText.getText(), this._value.getText(), false);
    }

    private async _onSensitiveValueChange(): Promise<void> {
        let text = this._sensitiveValue.getText();
        if (text == MacroRecordControl._defaultSensitiveText) return;

        await this._collection.setMacro(this._nameText.getText(), this._sensitiveValue.getText(), true);
    }

    private async _onSensitiveValueFocusIn(): Promise<void> {
        this._sensitiveValue.setText(await this._collection.getMacroValue(this._nameText.getText()));
    }

    private _onSensitiveFocusOut(): void {
        this._sensitiveValue.setText(MacroRecordControl._defaultSensitiveText);
    }

    private _onMouseEnter(): void {
        if (this._collection.isMacroSensitive(this._nameText.getText())) {
            this._preview.setVisibility(true);
        }

        this._lock.setVisibility(true);
    }

    private async _onMouseLeave(): Promise<void> {
        this._preview.setVisibility(false);

        if (this._inPreview) {
            this._inPreview = false;

            await this._lockMacro();
        }

        if (!this._collection.isMacroSensitive(this._nameText.getText())) {
            this._lock.setVisibility(false);
        }
    }

    private async _onLockClick(): Promise<void> {
        const name = this._nameText.getText();

        if (this._collection.isMacroSensitive(name) || this._inPreview) {
            let confirm = await SimpleModals.confirm(`Are you sure you want to unlock parameter ${name}?\n\n` +
            "Unlocked parameters are stored as plain text in collection JSON file. " +
            "If you share collection with others, they will be able to see value of the parameter.");

            if (!confirm) return;

            await this._unlockMacro();
            this._lock
                .setVisibility(false)
                .setInlineCss({ borderStyle: "none" });
        } else {
            this._lockMacro();
            this._lock.setInlineCss({ borderStyle: "solid" });
        }
    }

    private async _onPreviewClick(): Promise<void> {
        this._preview.setVisibility(false);

        const name = this._nameText.getText();
        if (!this._collection.isMacroSensitive(name)) return;

        this._inPreview = true;

        await this._unlockMacro();
    }

    private _onMacroValueChanged = async (e: SimpleEvent): Promise<void> => {
        let macroName = <string>(e["detail"]["macroName"]);
        let macroValue = <string>(e["detail"]["macroValue"]);

        if (macroName != this.getMacroName()) return;
        if (macroValue == this._value.getText()) return;
        if (this._collection.isMacroSensitive(macroName)) return;

        this._value.setText(macroValue);
    };
}

MacroRecordControl.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        height: "25px",
        alignItems: "center"
    },
    _name: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceParameter,
        width: "40%",
        minWidth: "50px",
        maxWidth: "200px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        paddingLeft: "15px",
        paddingRight: "10px"
    },
    _value: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        height: "20px",
        background: "none",
        border: "none",
        outline: "none",
        appearance: "none",
        flex: "1 1 1px",
        minWidth: "0px",
        overflow: "scroll",
        "&::-webkit-scrollbar": {
            display: "none"
        }
    },
    _sensitiveValue: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        height: "100%",
        background: "none",
        border: "none",
        outline: "none",
        appearance: "none",
        flex: "1 1 1px",
        minWidth: 0,
        "&::placeholder": {
            color: Colors.workspaceDefault
        }
    },
    _preview: {
        flex: "0 0 25px",
        height: "25px",
        fontSize: "14px",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        lineHeight: "25px",
        textAlign: "center",
        "&:hover": {
            color: Colors.workspaceDescriptor
        }
    },
    _lock: {
        flex: "0 0 21px",
        height: "21px",
        margin: "2px",
        marginRight: "5px",
        fontSize: "15px",
        border: `1px none ${Colors.workspaceDefault}`,
        borderRadius: "5px",
        color: Colors.workspaceDefault,
        cursor: "pointer",
        lineHeight: "21px",
        textAlign: "center",
        "&:hover": {
            color: Colors.workspaceDescriptor,
            borderColor: Colors.workspaceDescriptor
        }
    }
};
