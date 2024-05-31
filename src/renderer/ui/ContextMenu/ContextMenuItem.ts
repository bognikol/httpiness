import { Div } from "aflon";
import { Icon } from "../Icon";
import { Colors, FontStyles } from "../StyleConstants";
import { ContextMenuRun } from "./ContextMenu";

export enum ContextMenuItemType {
    Button, Title, Text, Divider, CheckBox
}

export interface ContextMenuItemDefinition {
    type: ContextMenuItemType;
    text?: string;
    id: string;
    disabled?: boolean;
    checked?: boolean;
    iconName?: string;
    iconSizeAdjustment?: number;
    submenu?: Array<ContextMenuItemDefinition>
}

export class ContextMenuItem extends Div {
    public eventItemSelected = "itemSelected";

    private _id: string;

    protected constructor(definition: ContextMenuItemDefinition) {
        super();

        this._id = definition.id;
    }

    static create(definition: ContextMenuItemDefinition): ContextMenuItem {
        if (definition.type == ContextMenuItemType.Button) {
            return new ContextMenuButton(definition);
        } else if (definition.type == ContextMenuItemType.Text) {
            return new ContextMenuText(definition);
        } else if (definition.type == ContextMenuItemType.Title) {
            return new ContextMenuTitle(definition);
        } else if (definition.type == ContextMenuItemType.Divider) {
            return new ContextMenuDivider(definition);
        } else if (definition.type == ContextMenuItemType.CheckBox) {
            return new ContextMenuCheckBox(definition);
        } else {
            throw new Error(`ContextMenuItemType ${definition.type} is not supported.`);
        }
    }

    getId(): string {
        return this._id;
    }
}

class ContextMenuButton extends ContextMenuItem {
    private static _defaultIconSize: number = 12;

    private _iconContainer: Div;
    private _text: Div;
    private _subMenuArrow: Div;

    private _submenu: Array<ContextMenuItemDefinition> = null;

    constructor(definition: ContextMenuItemDefinition) {
        super(definition);

        this.append([
            (this._iconContainer = new Div()),
            (this._text = new Div())
                .setText(definition.text),
            (this._subMenuArrow = new Div())
                .append([ new Icon("more") ])
                .setInlineCss({ display: "none" })
        ]);

        this._prepareDisabled(definition);
        this._prepareIcon(definition);
        this._prepareSubmenu(definition);
    }

    private _prepareDisabled(definition: ContextMenuItemDefinition): void {
        if (definition.disabled) {
            this.addAttr("disabled")
                .setInlineCss({
                    pointerEvents: "none"
                });

            this.setInlineCss({ color: Colors.tooltipDisabled });
        } else {
            this.removeAttr("disabled")
                .setInlineCss({
                    pointerEvents: "auto"
                });

            this.setInlineCss({ color: Colors.tooltipText });
        }
    }

    private _prepareIcon(definition: ContextMenuItemDefinition): void {
        if ("iconName" in definition) {
            let sizeAdjustment = 0;
            if ("iconSizeAdjustment" in definition)
                sizeAdjustment = definition.iconSizeAdjustment;

            let size = ContextMenuButton._defaultIconSize + sizeAdjustment;

            this._iconContainer.append([
                new Icon(definition.iconName).setInlineCss({
                    fontSize: size.toString() + "px"
                })
            ]);
        }
    }

    private _prepareSubmenu(definition: ContextMenuItemDefinition): void {
        if ("submenu" in definition) {
            this._submenu = definition.submenu;

            if (this._submenu != null) {
                this.on(this.eventMouseEnter, () => this._onMouseEnter());
                this._subMenuArrow.setInlineCss({ display: "block" });
            } else {
                this._subMenuArrow.setInlineCss({ display: "none" });
            }
        } else {
            this.on(this.eventMouseDown, () => this._onMouseDown());
        }
    }

    private _onMouseDown(): void {
        this.raise(this.eventItemSelected, {
            id: this.getId()
        });
    }

    private _onMouseEnter(): void {
        let rect = this.getHtmlElement().getBoundingClientRect();

        let left = rect.right + window.scrollX - 2;
        let top = rect.top + window.scrollY;

        let submenuRun = new ContextMenuRun();

        const onLeave = (): void => {
            this.off(this.eventMouseLeave, onLeave);
            this.removeChild(submenuRun);
        };

        this.on(this.eventMouseLeave, onLeave);
        this.append([ submenuRun ]);
        submenuRun.show(this._submenu, left, top, e => {
            this.raise(this.eventItemSelected, {
                id: e["detail"]["id"]
            });
        });
    }
}

ContextMenuButton.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        flex: "0 0 22px",
        cursor: "pointer",
        color: Colors.tooltipText,
        "&:hover": {
            background: Colors.tooltipBackgroundHover
        }
    },
    _iconContainer: {
        flex: "0 0 auto",
        width: "16px",
        height: "12px",
        lineHeight: "13px",
        textAlign: "center",
        marginLeft: "10px",
        marginRight: "7px"
    },
    _text: {
        ...FontStyles.sansSerifNormal,
        fontSize: "11px",
        lineHeight: "22px",
        flex: "1 1 100px",
        marginRight: "13px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    _subMenuArrow: {
        flex: "0 0 auto",
        width: "8px",
        height: "13px",
        fontSize: "13px",
        lineHeight: "13px",
        textAlign: "center",
        marginLeft: "8px",
        marginRight: "8px"
    }
};

class ContextMenuCheckBox extends ContextMenuItem {
    private _iconContainer: Div;
    private _icon: Icon;
    private _text: Div;

    constructor(definition: ContextMenuItemDefinition) {
        super(definition);

        this
            .append([
                (this._iconContainer = new Div())
                    .append([
                        (this._icon = new Icon("checkmark"))
                            .setVisibility(definition.checked)
                    ]),
                (this._text = new Div())
                    .setText(definition.text)
            ])
            .on(this.eventMouseDown, () => this._onMouseDown());

        this._prepareDisabled(definition);
    }

    private _prepareDisabled(definition: ContextMenuItemDefinition): void {
        if (definition.disabled) {
            this.addAttr("disabled")
                .setInlineCss({
                    pointerEvents: "none"
                });

            this.setInlineCss({ color: Colors.tooltipDisabled });
        } else {
            this.removeAttr("disabled")
                .setInlineCss({
                    pointerEvents: "auto"
                });

            this.setInlineCss({ color: Colors.tooltipText });
        }
    }

    private _onMouseDown(): void {
        this.raise(this.eventItemSelected, {
            id: this.getId(),
            checked: this._icon.getVisibility()
        });
    }
}

ContextMenuCheckBox.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        flex: "0 0 22px",
        cursor: "pointer",
        color: Colors.tooltipText,
        "&:hover": {
            background: Colors.tooltipBackgroundHover
        }
    },
    _iconContainer: {
        flex: "0 0 auto",
        width: "14px",
        height: "14px",
        border: `1px solid ${Colors.tooltipText}`,
        lineHeight: "14px",
        textAlign: "center",
        marginLeft: "10px",
        marginRight: "7px",
        fontSize: "9px"
    },
    _text: {
        ...FontStyles.sansSerifNormal,
        fontSize: "11px",
        lineHeight: "22px",
        flex: "1 1 100px",
        marginRight: "13px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    }
};

class ContextMenuText extends ContextMenuItem {
    private _text: Div;

    constructor(definition: ContextMenuItemDefinition) {
        super(definition);

        this.append([
            (this._text = new Div())
                .setText(definition.text)
        ]);
    }

    setText(text: string): this {
        this._text.setText(text);
        return this;
    }

    getText(): string {
        return this._text.getText();
    }
}

ContextMenuText.style = {
    _: {
        marginLeft: "10px",
        marginRight: "10px",
        marginTop: "3px",
        marginBottom: "3px",
        lineHeight: "16px",
        ...FontStyles.sansSerifNormal,
        color: Colors.tooltipText,
        fontSize: "10.5px"
    }
};

class ContextMenuTitle extends ContextMenuItem {

    private _text: Div;

    constructor(definition: ContextMenuItemDefinition) {
        super(definition);

        this.append([
            (this._text = new Div())
                .setText(definition.text)
        ]);
    }

    setText(text: string): this {
        this._text.setText(text);
        return this;
    }

    getText(): string {
        return this._text.getText();
    }
}

ContextMenuTitle.style = {
    _: {
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        flex: "0 0 22px",
        marginLeft: "10px",
        marginRight: "10px"
    },
    _text: {
        ...FontStyles.sansSerifBold,
        color: Colors.tooltipText,
        fontSize: "11px",
        lineHeight: "12px",
        flex: "1 1 100px"
    }
};

class ContextMenuDivider extends ContextMenuItem {
    private _line: Div;

    constructor(definition: ContextMenuItemDefinition) {
        super(definition);

        this.append([
            (this._line = new Div())
        ]);
    }
}

ContextMenuDivider.style = {
    _: {
        paddingTop: "4px",
        paddingBottom: "4px"
    },
    _line: {
        width: "100%",
        height: "1px",
        background: Colors.tooltipDisabled
    }
};
