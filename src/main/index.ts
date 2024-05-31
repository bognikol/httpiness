import { app, ipcMain, dialog, BrowserWindow } from "electron";

function createWindow (): void {
    const win = new BrowserWindow({
        width: 1200,
        height: 700,
        minWidth: 1200,
        minHeight: 600,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            webviewTag: true
        },
        title: "",
        frame: false,
        titleBarStyle: "hiddenInset"
    });

    win.loadFile("./index.html");
}

async function oauth2Window(url: string, host: string, queryKey: string): Promise<string> {
    return new Promise<string>((resolve) => {
        let win = new BrowserWindow({
            width: 500,
            height: 800
        });

        const tryClose = (): void => {
            setTimeout(() => {
                try {
                    if (!win) return;
                    win.close();
                    win = null;
                } catch (ex) {
                    console.log(ex);
                }
            }, 0);
        };

        const handleNavigate = (): void => {
            if (!win) return;
            let url = new URL(win.webContents.getURL());
            let hashSearchParams = new URLSearchParams(url.hash.substring(1));
            if (win.webContents.getURL().startsWith(host)) {
                if (url.searchParams.has(queryKey)) {
                    tryClose();
                    resolve(url.searchParams.get(queryKey));
                } else if (hashSearchParams.has(queryKey)) {
                    tryClose();
                    resolve(hashSearchParams.get(queryKey));
                }
            }
        };

        win.webContents.addListener("did-finish-load", handleNavigate);
        win.webContents.addListener("did-fail-load", handleNavigate);
        win.addListener("closed", () => {
            resolve(null);
        });

        win.loadURL(url);
    });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle("showOpenDialog", async (event, options) => {
    return await dialog.showOpenDialog(options);
});

ipcMain.handle("showSaveDialog", async (event, options) => {
    return await dialog.showSaveDialog(options);
});

ipcMain.handle("showMessageBox", async (event, options) => {
    return await dialog.showMessageBox(options);
});

ipcMain.handle("maximize", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.maximize();
});

ipcMain.handle("minimize", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.minimize();
});

ipcMain.handle("unmaximize", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.unmaximize();
});

ipcMain.handle("isMaximized", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return false;
    return browserWindow.isMaximized();
});

ipcMain.handle("close", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.close();
});

ipcMain.handle("goFullScreen", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.setFullScreen(true);
});

ipcMain.handle("exitFullScreen", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.setFullScreen(false);
});

ipcMain.handle("isInFullScreen", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return false;
    return browserWindow.isFullScreen();
});

ipcMain.handle("goKiosk", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.setKiosk(true);
});

ipcMain.handle("exitKiosk", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.setKiosk(false);
});

ipcMain.handle("isInKiosk", (event) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return false;
    return browserWindow.isKiosk();
});

ipcMain.handle("setMacOsTrafficLightsPosition", (event, x, y) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    browserWindow.setWindowButtonPosition({ x, y });
});

ipcMain.handle("oauth2", async (event, url, redirectHost, queryKey) => {
    return await oauth2Window(url, redirectHost, queryKey);
});
