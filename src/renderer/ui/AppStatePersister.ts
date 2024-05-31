export interface OpenWItemRecord {
    path: string;
    collectionUuid: string;
    pinned: boolean;
}

class HttpinessStatePersister {
    private static _openCollectionsLocalStorageKey = "collectionsCache";
    private static _openWItemsLocalStorageKey = "workspace-items";
    private static _parametersWidth = "parameters-width";
    private static _requestBrowserWidth = "req-browser-width";


    setOpenedCollections(collections: Array<string>): void {
        localStorage.setItem(HttpinessStatePersister._openCollectionsLocalStorageKey,
            JSON.stringify(collections)
        );
    }

    getOpenedCollections(): Array<string> {
        try {
            let items = JSON.parse(localStorage.getItem(HttpinessStatePersister._openCollectionsLocalStorageKey));

            if (!items || !Array.isArray(items)) return [];
            return <Array<string>>items;
        } catch {
            return [];
        }
    }

    setOpenedWItems(witems: Array<OpenWItemRecord>): void {
        localStorage.setItem(HttpinessStatePersister._openWItemsLocalStorageKey, JSON.stringify(witems));
    }

    getOpenedWItems(): Array<OpenWItemRecord> {
        try {
            let items = JSON.parse(localStorage.getItem(HttpinessStatePersister._openWItemsLocalStorageKey));

            if (!items || !Array.isArray(items)) return [];
            return <Array<OpenWItemRecord>>(items);
        } catch {
            return [];
        }
    }

    setParametersWidth(width: number): void {
        localStorage.setItem(HttpinessStatePersister._parametersWidth, JSON.stringify(width));

    }

    getParametersWidth(): number {
        try {
            let items = JSON.parse(localStorage.getItem(HttpinessStatePersister._parametersWidth));
            return Number.parseFloat(items);
        } catch {
            return 350;
        }
    }

    setRequestBrowserWidth(width: number): void {
        localStorage.setItem(HttpinessStatePersister._requestBrowserWidth, JSON.stringify(width));
    }

    getRequestBrowserWidth(): number {
        try {
            let items = JSON.parse(localStorage.getItem(HttpinessStatePersister._requestBrowserWidth));
            return Number.parseFloat(items);
        } catch {
            return 300;
        }
    }
}

export let AppStatePersister = new HttpinessStatePersister();
