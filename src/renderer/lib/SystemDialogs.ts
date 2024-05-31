import { OpenDialogOptions, SaveDialogOptions, MessageBoxOptions, ipcRenderer,
    OpenDialogReturnValue, SaveDialogReturnValue, MessageBoxReturnValue } from "electron";

export async function showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    return await <Promise<OpenDialogReturnValue>>ipcRenderer.invoke("showOpenDialog", options);
}

export async function showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
    return await <Promise<SaveDialogReturnValue>>ipcRenderer.invoke("showSaveDialog", options);
}

export async function showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue> {
    return await <Promise<MessageBoxReturnValue>>ipcRenderer.invoke("showMessageBox", options);
}

export async function showConfirmNative(text: string): Promise<boolean> {
    const buttonIdx = await showMessageBox({
        type: "question",
        buttons: ["Yes", "No"],
        defaultId: 0,
        cancelId: 1,
        message: text
    });

    return buttonIdx.response === 0;
}

export async function showChooseNative(text: string, options: Array<{ text: string, id: string }>): Promise<string> {
    const buttonIdx = await showMessageBox({
        type: "question",
        buttons: options.map(option => option.text),
        message: text
    });

    return options[buttonIdx.response].id;
}

export async function showAlertNative(text: string, button: string = "OK"): Promise<void> {
    await showMessageBox({
        type: "info",
        buttons: [button],
        message: text
    });
}
