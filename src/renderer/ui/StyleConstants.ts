import { CSSProperties } from "aflon";
import { HttpRequestMethod } from "../lib/http";
import { PreferenceStore } from "./PreferenceStore";

export enum ColorTheme {
    Dark = "dark", Light = "light"
}

const Themes = {
    [ColorTheme.Dark]: {
        colors: {
            controlBarBackground: "#1A1A1A",
            textSelection:        "#234854",
            backgroundDefault:    "#1A1A1A",
            workspaceDefault:     "#C5C5C5",
            workspacePlaceholder: "#6C6C6C",
            workspaceAccent:      "#00C2FF",
            workspaceParameter:   "#FF5252",
            workspaceDescriptor:  "#FFFFFF",
            workspaceLine:        "#4E4E4E",
            workspaceLineWeak:    "#323232",
            workspaceSearch:      "#FFF500",
            workspaceSearchFocus: "#FF5252",
            browserBackDefault:   "#272727",
            browserBackSelected:  "#1A1A1A",
            browserBackHover:     "#000000",
            browserDefault:       "#C5C5C5",
            browserTextSelection: "#2522B5",
            methodGet:            "#00BB13",
            methodPost:           "#FF8A00",
            methodPut:            "#3AB4BC",
            methodDelete:         "#E40000",
            methodOther:          "#B5B5B5",
            consoleBackground:    "#272727",
            consoleBorder:        "#4E4E4E",
            consoleDominant:      "#FFFFFF",
            consoleDefault:       "#C5C5C5",
            statusOK:             "#00BB13",
            statusWarn:           "#FF8A00",
            statusError:          "#E40000",
            statusForeground:     "#FFFFFF",
            tooltipText:          "#C5C5C5",
            tooltipDisabled:      "#8B8B8B",
            tooltipBackgroundDefault: "#3C3C3C",
            tooltipBackgroundHover: "#1A1A1A",
            scrollThumb:          "#40404044"
        },
        boxShadowValues: {
            consoleCollapsed: "0px 0px 10px 0px rgba(0,0,0,1)",
            consoleExtended: "0px 0px 100px 0px rgba(0,0,0,1)",
            contextMenu: "0px 0px 10px 0px rgba(0,0,0,0.7)",
            button: "0px 3px 3px 0px rgba(0,0,0,0.5)"
        },
        imageUrls: {
            wordmark: "./resources/images/HttpinessWordMark.darktheme.svg"
        }
    },
    [ColorTheme.Light]: {
        colors: {
            controlBarBackground: "#ffffff",
            textSelection:        "#e5e5e5",
            backgroundDefault:    "#ffffff",
            workspaceDefault:     "#5a5a5a",
            workspacePlaceholder: "#939393",
            workspaceAccent:      "#00C2FF",
            workspaceParameter:   "#F02D2D",
            workspaceDescriptor:  "#000000",
            workspaceLine:        "#d1d1d1",
            workspaceLineWeak:    "#e1e1e1",
            workspaceSearch:      "#FFB800",
            workspaceSearchFocus: "#FF5252",
            browserBackDefault:   "#f4f4f4",
            browserBackSelected:  "#f4f4f4",
            browserBackHover:     "#ffffff",
            browserDefault:       "#5a5a5a",
            methodGet:            "#00BB13",
            methodPost:           "#FF9900",
            methodPut:            "#25CDD8",
            methodDelete:         "#E40000",
            methodOther:          "#4a4a4a",
            consoleBackground:    "#f4f4f4",
            consoleBorder:        "#c1c1c1",
            consoleDominant:      "#000000",
            consoleDefault:       "#5a5a5a",
            statusOK:             "#00BB13",
            statusWarn:           "#FF8A00",
            statusError:          "#E40000",
            statusForeground:     "#FFFFFF",
            tooltipText:          "#5a5a5a",
            tooltipDisabled:      "#b0b0b0",
            tooltipBackgroundDefault: "#f4f4f4",
            tooltipBackgroundHover: "#ffffff",
            scrollThumb:          "#c0c0c044"
        },
        boxShadowValues: {
            consoleCollapsed: "0px 0px 7px 0px rgba(0,0,0,0.25)",
            consoleExtended: "0px 0px 100px 0px rgba(0,0,0,0.4)",
            contextMenu: "0px 3px 10px 0px rgba(0,0,0,0.32)",
            button: "0px 3px 3px 0px rgba(0,0,0,0.25)"
        },
        imageUrls: {
            wordmark: "./resources/images/HttpinessWordMark.lighttheme.svg"
        }
    }
};

let theme: ColorTheme = PreferenceStore.getColorTheme();

export const Colors          = Themes[theme].colors;
export const BoxShadowValues = Themes[theme].boxShadowValues;
export const ImageUrls       = Themes[theme].imageUrls;

export function getMethodColor(method: HttpRequestMethod): string {
    if (method == HttpRequestMethod.GET) {
        return Colors.methodGet;
    } else if (method == HttpRequestMethod.POST) {
        return Colors.methodPost;
    } else if (method == HttpRequestMethod.PUT) {
        return Colors.methodPut;
    } else if (method == HttpRequestMethod.DELETE) {
        return Colors.methodDelete;
    } else {
        return Colors.workspaceDefault;
    }
}

export function getShortMethodDesignation(method: HttpRequestMethod): string {
    if      (method == HttpRequestMethod.GET)     return "GET";
    else if (method == HttpRequestMethod.POST)    return "POS";
    else if (method == HttpRequestMethod.PUT)     return "PUT";
    else if (method == HttpRequestMethod.DELETE)  return "DEL";
    else if (method == HttpRequestMethod.CONNECT) return "CON";
    else if (method == HttpRequestMethod.HEAD)    return "HED";
    else if (method == HttpRequestMethod.OPTIONS) return "OPT";
    else if (method == HttpRequestMethod.PATCH)   return "PAT";
    else if (method == HttpRequestMethod.TRACE)   return "TRC";
    else                                          return "OTH";
}

export function getStatusColor(status: number): string {
    if (status >= 500) return Colors.statusError;
    if (status >= 200 && status < 300) return Colors.statusOK;
    return Colors.statusWarn;
}

export const FontStyles: Record<string, CSSProperties> = {
    monoSpace: {
        fontFamily: "Ubuntu Mono",
        fontWeight: 400,
        fontSize:   "15px",
        lineHeight: "20px"
    },
    sansSerifNormal: {
        fontFamily: "Open Sans",
        fontWeight: 400
    },
    sansSerifBold: {
        fontFamily: "Open Sans",
        fontWeight: 700
    },
    sansSerifExtraBold: {
        fontFamily: "Open Sans",
        fontWeight: 800
    }
};

export const ZIndexLayers = {
    base: 0,
    consoleBackground: 40,
    console: 50,
    modal: 100,
    context: 150,
    tooltip: 200
};
