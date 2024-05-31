/* eslint-disable @typescript-eslint/ban-types */
import { HttpReqt } from "./HttpReqt";
import { HttpAuth } from "./HttpAuth";
import { HttpCollectionItem } from "./HttpCollectionItem";

export class HttpDir extends HttpCollectionItem {
    protected _authChildren: Array<HttpAuth> = [];
    protected _dirChildren:  Array<HttpDir>  = [];
    protected _reqtChildren: Array<HttpReqt> = [];

    fromPlainObject(plainObject: Object): this {
        this._name = plainObject["name"];
        this._authChildren = [...plainObject["authChildren"]].map(obj => new HttpAuth().setParent(this).fromPlainObject(obj));
        this._dirChildren = [...plainObject["dirChildren"]].map(obj => new HttpDir().setParent(this).fromPlainObject(obj));
        this._reqtChildren = [...plainObject["reqtChildren"]].map(obj => new HttpReqt().setParent(this).fromPlainObject(obj));

        return this;
    }

    toPlainObject(): Object {
        return {
            name: this.getName(),
            authChildren: this._authChildren.map(a => a.toPlainObject()),
            reqtChildren: this._reqtChildren.map(r => r.toPlainObject()),
            dirChildren: this._dirChildren.map(d => d.toPlainObject())
        };
    }

    setParent(parent: HttpDir): this {
        super.setParent(parent);
        return this;
    }

    getParent(): HttpDir {
        return <HttpDir> this._parent;
    }

    isAscendantOf(item: HttpCollectionItem): boolean {
        let currentItem: HttpCollectionItem = item;

        while (currentItem) {
            currentItem = currentItem.getParent();
            if (currentItem == this)
                return true;
        }
        return false;
    }

    findFromRelativePath(path: string): HttpCollectionItem {
        return this._findItem(path.split("/"));
    }

    findFromAbsolutePath(path: string): HttpCollectionItem {
        if (!path.startsWith(this.getFullPath())) return null;
        let relativePath = path.replace(`${this.getFullPath()}/`, "");
        return this.findFromRelativePath(relativePath);
    }

    addDir(dir: HttpDir): boolean {
        if (this.containsChild(dir.getName())) return false;

        this._dirChildren.push(dir);
        dir.setParent(this);
        this._makeDirty();
        return true;
    }

    removeDir(dir: HttpDir): void {
        dir.raise(dir.eventAboutToBeDeleted);
        this._dirChildren = this._dirChildren.filter(dirChild => dirChild != dir);
        this._makeDirty();
    }

    getDirs(): Array<HttpDir> {
        return this._dirChildren;
    }

    addReqt(reqt: HttpReqt, insertAfter: HttpReqt = null): boolean {
        if (this.containsChild(reqt.getName())) return false;

        if (insertAfter == null) {
            this._reqtChildren.push(reqt);
        } else {
            let index = this._reqtChildren.indexOf(insertAfter);
            if (index == -1) return false;

            this._reqtChildren.splice(index + 1, 0, reqt);
        }
        reqt.setParent(this);
        this._makeDirty();
        return true;
    }

    removeReqt(reqt: HttpReqt): void {
        reqt.raise(reqt.eventAboutToBeDeleted);
        this._reqtChildren = this._reqtChildren.filter(reqtChild => reqtChild != reqt);
        this._makeDirty();
    }

    getReqts(): Array<HttpReqt> {
        return this._reqtChildren;
    }

    addAuth(auth: HttpAuth): boolean {
        if (this.containsChild(auth.getName())) return false;

        this._authChildren.push(auth);
        auth.setParent(this);
        this._makeDirty();
        return true;
    }

    removeAuth(auth: HttpAuth): void {
        auth.raise(auth.eventAboutToBeDeleted);
        this._authChildren = this._authChildren.filter(authChild => authChild != auth);
        this._makeDirty();
    }

    getAuths(): Array<HttpAuth> {
        return this._authChildren;
    }

    clone(): HttpDir {
        let clone = new HttpDir();

        clone.setName(this._name);
        this._authChildren.forEach(child => clone.addAuth(child.clone()));
        this._reqtChildren.forEach(child => clone.addReqt(child.clone()));
        this._dirChildren.forEach(child => clone.addDir(child.clone()));

        return clone;
    }

    getMacroNames(): Array<string> {
        let names: Array<string> = [];

        this._authChildren.forEach(a => a.getMacroNames().forEach(name => names.push(name)));
        this._reqtChildren.forEach(r => r.getMacroNames().forEach(name => names.push(name)));
        this._dirChildren.forEach(d => d.getMacroNames().forEach(name => names.push(name)));

        let tempSet = new Set(names);
        return [...tempSet];
    }

    containsChild(name: string): boolean {
        for (let auth of this._authChildren)
            if (auth.getName() == name) return true;

        for (let dir of this._dirChildren)
            if (dir.getName() == name) return true;

        for (let reqt of this._reqtChildren)
            if (reqt.getName() == name) return true;

        return false;
    }

    _initSymLinks(): void {
        this._authChildren.forEach(auth => auth._initSymLinks());
        this._reqtChildren.forEach(reqt => reqt._initSymLinks());
        this._dirChildren.forEach(dir => dir._initSymLinks());
    }

    private _findItem(names: Array<string>): HttpCollectionItem {
        if (names.length == 0) return this;

        let childName = names[0];
        let leftOver = names.slice(1);

        let index;
        index = this._dirChildren.findIndex(dir => dir.getName() == childName);
        if (index != -1)
            return this._dirChildren[index]._findItem(leftOver);

        index = this._reqtChildren.findIndex(reqt => reqt.getName() == childName);
        if (index != -1)
            return this._reqtChildren[index];

        index = this._authChildren.findIndex(auth => auth.getName() == childName);
        if (index != -1)
            return this._authChildren[index];

        return null;
    }
}
