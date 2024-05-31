import { ipcRenderer, webFrame } from "electron";

import { currentPlatform, Platform } from "./Platform";

export async function minimize(): Promise<void> {
    await ipcRenderer.invoke("minimize");
}

export async function maximize(): Promise<void> {
    await ipcRenderer.invoke("maximize");
}

export async function unmaximize(): Promise<void> {
    await ipcRenderer.invoke("unmaximize");
}

export async function isMaximized(): Promise<boolean> {
    return await <Promise<boolean>>ipcRenderer.invoke("isMaximized");
}

export async function close(): Promise<void> {
    await ipcRenderer.invoke("close");
}

export async function goFullScreen(): Promise<void> {
    await ipcRenderer.invoke("goFullScreen");
}

export async function exitFullScreen(): Promise<void> {
    await ipcRenderer.invoke("exitFullScreen");
}

export async function isInFullScreen(): Promise<boolean> {
    return await <Promise<boolean>>ipcRenderer.invoke("isInFullScreen");
}

export async function goKiosk(): Promise<void> {
    await ipcRenderer.invoke("goKiosk");
}

export async function exitKiosk(): Promise<void> {
    await ipcRenderer.invoke("exitKiosk");
}

export async function isInKiosk(): Promise<boolean> {
    return await <Promise<boolean>>ipcRenderer.invoke("isInKiosk");
}

export async function setMacOsTrafficLightsPosition(x: number, y: number): Promise<void> {
    await ipcRenderer.invoke("setMacOsTrafficLightsPosition", x, y);
}

export class ZoomManager {
    private static readonly _availableZooms: Array<number> = [ 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3 ];
    private static _currentZoomIndex: number;
    private static _hasInit: boolean = false;

    static zoomIn(): void {
        ZoomManager.init();

        ZoomManager._currentZoomIndex++;
        if (ZoomManager._currentZoomIndex > ZoomManager._availableZooms.length - 1)
            ZoomManager._currentZoomIndex = ZoomManager._availableZooms.length - 1;

        ZoomManager._updateZoomLevel();
    }

    static zoomOut(): void {
        ZoomManager.init();

        ZoomManager._currentZoomIndex--;
        if (ZoomManager._currentZoomIndex < 0)
            ZoomManager._currentZoomIndex = 0;

        ZoomManager._updateZoomLevel();
    }

    static zoomReset(): void {
        ZoomManager.init();

        ZoomManager._currentZoomIndex = ZoomManager._availableZooms.indexOf(1.0);
        ZoomManager._updateZoomLevel();
    }

    public static init(): void {
        if (ZoomManager._hasInit) return;

        ZoomManager._hasInit = true;

        let result: number = Number.parseInt(localStorage.getItem("zoom"));

        if (Number.isNaN(result) || result < 0 || result > ZoomManager._availableZooms.length - 1) {
            ZoomManager._currentZoomIndex = 3;
        } else {
            ZoomManager._currentZoomIndex = result;
        }

        ZoomManager._updateZoomLevel();
    }

    private static _updateZoomLevel(): void {
        let zoom = ZoomManager._availableZooms[ZoomManager._currentZoomIndex];
        webFrame.setZoomFactor(zoom);
        localStorage.setItem("zoom", ZoomManager._currentZoomIndex.toString());

        if (currentPlatform() == Platform.MacOS) {
            setTimeout(async () => {
                setMacOsTrafficLightsPosition(19 * zoom - 5, 19 * zoom - 7);
            }, 0);
        }
    }
}

ZoomManager.init();
