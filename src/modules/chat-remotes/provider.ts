import type { ProviderConfig } from "@/types/config";

export function GetProviderUrl(data: ProviderConfig) {
    const base = data.baseURL, path = data.requestPath;
    if (base.endsWith('/') && path.startsWith('/'))
        return base + path.substring(1);
    else if (!base.endsWith('/') && !path.startsWith('/'))
        return base + '/' + path;
    else
        return base + path;
}

