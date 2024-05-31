import { Div, TextBox } from "aflon";
import { Icon } from "../../Icon";
import { Colors, FontStyles } from "../../StyleConstants";

export class SearchToolbox extends Div {
    public eventSearchParamsChanged = "searchParamsChanged";
    public eventFocusNextResult = "focusNextResult";
    public eventFocusPreviousResult = "focusPreviousResult";

    private _searchTextBox: TextBox;
    private _currentResult: Div;
    private _nextBtn: Icon;
    private _previousBtn: Icon;
    private _closeBtn: Icon;

    private _searchBoxTimeout: NodeJS.Timeout = null;

    constructor() {
        super();

        this.append([
            (this._searchTextBox = new TextBox())
                .setPlaceholder("Enter search phrase")
                .on(this._searchTextBox.eventInput, () => this._onSearchTxtBxInput())
                .on(this._searchTextBox.eventKeyDown, e => this._onSearchBoxKeyDown(e)),
            (this._currentResult = new Div())
                .setText("No hits"),
            (this._nextBtn = new Icon("more"))
                .on(this._nextBtn.eventClick, () => this._onNextBtnClick()),
            (this._previousBtn = new Icon("more"))
                .on(this._previousBtn.eventClick, () => this._onPreviousBtnClick()),
            (this._closeBtn = new Icon("close"))
                .on(this._closeBtn.eventClick, () => this._onClick())
        ]);
    }

    setResultNumber(resultNumber: number): this {
        if (resultNumber == 0)
            this._currentResult.setText("No hits");
        else
            this._currentResult.setText(`${resultNumber} hits`);

        return this;
    }

    activate(): this {
        this.setVisibility(true);
        this._searchTextBox.focus();
        this.raise(this.eventSearchParamsChanged, {
            text: this._searchTextBox.getText()
        });
        return this;
    }

    deactivate(): this {
        if (this._searchBoxTimeout != null)
            clearTimeout(this._searchBoxTimeout);

        this.setVisibility(false);
        this._searchTextBox.setText("");
        this.raise(this.eventSearchParamsChanged, {
            text: this._searchTextBox.getText()
        });

        return this;
    }

    private _onNextBtnClick(): void {
        this.raise(this.eventFocusNextResult);
    }

    private _onPreviousBtnClick(): void {
        this.raise(this.eventFocusPreviousResult);
    }

    private _onClick(): void {
        this.deactivate();
    }

    private _onSearchBoxKeyDown(e: Event): void {
        let keyEvent = <KeyboardEvent>e;

        if (keyEvent.key == "Escape")
            this.deactivate();

        if (keyEvent.key == "Enter")
            this.raise(this.eventFocusNextResult);
    }

    private _onSearchTxtBxInput(): void {
        if (this._searchBoxTimeout != null)
            clearTimeout(this._searchBoxTimeout);

        this._searchBoxTimeout = setTimeout(() => {
            this.raise(this.eventSearchParamsChanged, {
                text: this._searchTextBox.getText()
            });
            this._searchBoxTimeout = null;
        }, 500);
    }
}

SearchToolbox.style = {
    _: {
        ...FontStyles.sansSerifNormal,
        display: "flex",
        flexFlow: "row nowrap",
        alignItems: "center",
        height: "35px",
        width: "350px",
        background: Colors.backgroundDefault,
        borderColor: Colors.workspaceLine,
        borderTop: "none",
        color: Colors.workspaceDefault,
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "0 0 8px 8px",
        fontSize: "12px",
        paddingLeft: "10px",
        paddingRight: "5px"
    },
    _searchTextBox: {
        ...FontStyles.monoSpace,
        color: Colors.workspaceDefault,
        height: "22px",
        minWidth: "1px",
        flex: "1 1 1px",
        border: "none",
        outline: "none",
        background: "none",
        "&::placeholder": {
            color: Colors.workspacePlaceholder
        }
    },
    _currentResult: {
        marginLeft: "5px",
        marginRight: "5px",
        flex: "0 0 content"
    },
    _nextBtn: {
        fontSize: "15px",
        flex: "0 0 30px",
        height: "30px",
        transform: "rotate(90deg)",
        textAlign: "center",
        lineHeight: "30px",
        cursor: "pointer",
        color: Colors.workspaceDefault,
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _previousBtn: {
        fontSize: "15px",
        flex: "0 0 30px",
        height: "30px",
        transform: "rotate(-90deg)",
        textAlign: "center",
        lineHeight: "30px",
        cursor: "pointer",
        color: Colors.workspaceDefault,
        "&:hover": {
            color: Colors.consoleDominant
        }
    },
    _closeBtn: {
        flex: "0 0 30px",
        height: "30px",
        lineHeight: "30px",
        textAlign: "center",
        cursor: "pointer",
        color: Colors.workspaceDefault,
        "&:hover": {
            color: Colors.consoleDominant
        }
    }
};
