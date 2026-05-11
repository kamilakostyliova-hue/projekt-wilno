type BackendOfflineBundle = {
  generated_at: string;
  persons: Array<unknown>;
  graves: Array<unknown>;
  poi: Array<unknown>;
  map: Record<string, unknown>;
  messages: Record<string, string>;
};

const STORAGE_KEY = "rossa-backend-offline-bundle";

export const readCachedBackendOfflineBundle = (): BackendOfflineBundle | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    return cached ? (JSON.parse(cached) as BackendOfflineBundle) : null;
  } catch {
    return null;
  }
};

export const syncBackendOfflineBundle = async (): Promise<BackendOfflineBundle | null> => {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/api/offline-bundle", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return readCachedBackendOfflineBundle();
    }

    const bundle = (await response.json()) as BackendOfflineBundle;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
    return bundle;
  } catch {
    return readCachedBackendOfflineBundle();
  }
};
