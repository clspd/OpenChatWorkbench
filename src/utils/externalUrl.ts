import { domain_name_main_root, webview_trusted_domains } from "@/config";

export const checkUrlIsExternal = (url: { origin: string; hostname: string; }) =>
    url.origin !== location.origin &&
    url.hostname !== domain_name_main_root &&
    (!webview_trusted_domains.some(v =>
        url.hostname.endsWith(v)
    ));