import { Div } from "aflon";

import { AuthType, HttpAuth, HttpDir, HttpReqt } from "../../../lib/http";
import { SimpleEvent } from "../../../lib/SimpleEvent";

import { ContextMenu, ContextMenuItemDefinition, ContextMenuItemType, ContextMenuShowTrigger } from "../../ContextMenu";
import { ExpandableRow } from "../../ExpandableTable";
import { Colors, FontStyles } from "../../StyleConstants";
import { Button } from "../../BasicControls";
import { SimpleModals } from "../../Modals";

import { AuthDefinitionControl } from "./AuthDefinitionControl";

export class AuthExpandableRow extends ExpandableRow {
    public eventAuthChanged = "authChanged";

    private _authSelectBox: Div;
    private _authButton: Button;
    private _authDefinition: AuthDefinitionControl;

    private _authContextMenu: ContextMenu;

    private _reqt: HttpReqt = null;

    constructor() {
        super();

        this.setTitle("Auth")
            .appendContent([
                new Div()
                    .append([
                        (this._authSelectBox = new Div())
                            .setText("Inherit authentication ('Default Auth' in ancestor directory)")
                            .addCssClass({
                                ...FontStyles.sansSerifBold,
                                color: Colors.workspaceDefault,
                                cursor: "pointer",
                                textDecoration: "underline",
                                fontSize: "12px",
                                display: "inline-block",
                                marginRight: "10px",
                                whiteSpace: "nowrap"
                            }),
                        (this._authButton = new Button())
                            .setText("Execute auth flow")
                            .addCssClass({
                                borderRadius: "3px",
                                padding: "2px 6px",
                                fontSize: "11px",
                                height: "auto"
                            })
                            .on(this._authButton.eventClick, () => this._onAuthButtonClick())
                    ])
                    .addCssClass({
                        display: "flex",
                        flexFlow: "row nowrap",
                        marginBottom: "10px"
                    }),
                (this._authDefinition = new AuthDefinitionControl())
                    .on(this._authDefinition.eventAuthDefinitionChanged, () => this._onLocalAuthDefChanged())
                    .setVisibility(false)
            ]);

        (this._authContextMenu = new ContextMenu(this._authSelectBox, [], ContextMenuShowTrigger.OnClickEvent, 400))
            .on(this._authContextMenu.eventAboutToBeShown, () => this._onContextMenuAboutToBeShown())
            .on(this._authContextMenu.eventSelected, e => this._onContextMenuSelected(e));
    }

    setReqt(reqt: HttpReqt): this {
        if (this._reqt != null)
            this._reqt.off(this._reqt.eventAuthChanged, this._onAuthChanged);

        this._reqt = reqt;

        if (this._reqt == null) return this;

        this._reqt.on(this._reqt.eventAuthChanged, this._onAuthChanged);

        let auth = this._reqt.getAuth();

        if (!auth) {
            this._authSelectBox.setText("Inherit authentication ('Default Auth' in ancestor directory)");
            this._authDefinition.setVisibility(false);
            this._authButton.setVisibility(false);
            return this;
        }

        let authDefVisibility = false;
        let authButtonVisibility = false;

        if (auth.getParent() != this._reqt) {
            this._authSelectBox.setText(auth.getFullPath().substring(1));
        } else if (auth.getAuthDefinition().type == AuthType.None) {
            this._authSelectBox.setText("No authentication");
        } else {
            this._authSelectBox.setText("Request-specific authentication");
            this._authDefinition.setAuthDefinition(auth.getAuthDefinition(), auth.getAuthLocation());
            authDefVisibility = true;
        }

        if (this._reqt.getAuth().getAuthDefinition().type == AuthType.OAuth2) {
            authButtonVisibility = true;
        }

        this._authDefinition.setVisibility(authDefVisibility);
        this._authButton.setVisibility(authButtonVisibility);

        return this;
    }

    getReqt(): HttpReqt {
        return this._reqt;
    }

    private _onLocalAuthDefChanged(): void {
        if (this._reqt.getAuth().getParent() != this._reqt) return;
        this._reqt.setAuth(new HttpAuth()
            .setParent(this._reqt)
            .setAuthDefinition(this._authDefinition.getAuthDefinition())
            .setAuthLocation(this._authDefinition.getAuthLocation()));
    }

    private _onContextMenuAboutToBeShown(): void {
        let items: Array<ContextMenuItemDefinition> = [
            { type: ContextMenuItemType.Button, text: "No authentication", id: "none"  },
            { type: ContextMenuItemType.Button, text: "Inherit authentication", id: "inherit"  },
            { type: ContextMenuItemType.Button, text: "Request-specific authentication", id: "local" },
            { type: ContextMenuItemType.Divider, id: "div" }
        ];

        let auths: Array<HttpAuth> = [];

        let readAllAuths = (dir: HttpDir): void => {
            auths = [ ...auths, ...dir.getAuths() ];
            for (let childDir of dir.getDirs())
                readAllAuths(childDir);
        };

        readAllAuths(this._reqt.getContainingCollection());

        auths.forEach(
            auth => items.push({ type: ContextMenuItemType.Button, text: auth.getFullPath().substring(1), id: auth.getFullPath()  })
        );

        this._authContextMenu.setDefinition(items);
    }

    private _onContextMenuSelected(e: SimpleEvent): void {
        let fullPath: string = <string>(e["detail"]["id"]);

        if (fullPath == "none") {
            this._reqt.setAuth(new HttpAuth()
                .setParent(this._reqt)
                .setAuthDefinition({ type: AuthType.None }));
            return;
        }

        if (fullPath == "inherit") {
            this._reqt.setAuth(null);
            return;
        }

        if (fullPath == "local") {
            if (this._authDefinition.getVisibility())
                return;

            this._reqt.setAuth(new HttpAuth()
                .setParent(this._reqt)
                .setAuthDefinition({ type: AuthType.ApiKey }));
            return;
        }

        let auth = <HttpAuth> this._reqt.getContainingCollection().findFromAbsolutePath(fullPath);
        if (!auth) return;

        this._reqt.setAuth(auth);
    }

    private _onAuthChanged = (): void => {
        let auth = this._reqt.getAuth();

        if (!auth) {
            this._authDefinition.setVisibility(false);
            this._authSelectBox.setText("Inherit authentication ('Default Auth' in ancestor directory)");
            this._authButton.setVisibility(false);
            return;
        }

        if (auth.getParent() != this._reqt) {
            this._authDefinition.setVisibility(false);
            this._authSelectBox.setText(auth.getFullPath().substring(1));
        } else {
            let definition = auth.getAuthDefinition();

            if (definition.type == AuthType.None) {
                this._authSelectBox.setText("No authentication");
                this._authDefinition.setVisibility(false);
            } else {
                this._authSelectBox.setText("Request-specific authentication");
                this._authDefinition
                    .setVisibility(true)
                    .setAuthDefinition(definition, auth.getAuthLocation());
            }
        }

        if (auth.getAuthDefinition().type == AuthType.OAuth2)
            this._authButton.setVisibility(true);
        else
            this._authButton.setVisibility(false);
    };

    private async _onAuthButtonClick(): Promise<void> {
        if (this._reqt.getAuth().getAuthDefinition().type != AuthType.OAuth2) return;

        let result = await this._reqt.getAuth().authorize();

        if (result)
            SimpleModals.alert(`There was an error during authentication: ${result}`);
        else
            SimpleModals.alert("Authentication was successful. Token is saved and will be added to requests which use this authentication method.");
    }
}
