import { clipboard } from "electron";

interface Clipboard {
    setText(text: string): void;
    getText(): string;
}

class ElectronClipboard implements Clipboard {
    setText(text: string): void {
        clipboard.writeText(text);
    }

    getText(): string {
        return clipboard.readText();
    }
}

export const Clipboard: Clipboard = new ElectronClipboard();
