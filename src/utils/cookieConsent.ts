import { domain_name_root } from "@/config";
import { useAppStateStore } from "@/stores/appState";
import type { CookieConsent } from "@/types/cookieConsent";
import { db } from "@/userdata";

let cookieConsentUpdatedAt = 0;
export async function InitCookieConsent(updatedAt: number) {
    cookieConsentUpdatedAt = updatedAt;

    if (!(await isCookieConsentValid())) useAppStateStore().showCookieConsent = true;
}

let consentCache: CookieConsent | null = null;

export async function getCookieConsent() {
    // if we have cached value, return it
    if (consentCache) return consentCache;
    // first try to load from HTTP COOKIE
    const cookieConsent = await loadCookieConsentFromHttpCookie();
    if (cookieConsent) {
        consentCache = cookieConsent;
        // as we all know, cookies have a max-age, so 
        // we need to set it again to expand the expiration time
        await setCookieConsent(cookieConsent); // only be called once in each session because of the cache
        return cookieConsent;
    }
    // then try to load from IndexedDB
    const value = await db.get('config', 'cookieConsent');
    if (!value || !value.isCookieConsentType) return null;
    const typedValue = value as CookieConsent;
    consentCache = typedValue;
    await setCookieConsent(typedValue); // only be called once in each session
    return typedValue;
};

export async function isCookieConsentValid() {
    const cookieConsent = await getCookieConsent();
    if (!cookieConsent) return false;
    return cookieConsent.updatedAt === cookieConsentUpdatedAt;
}

export async function setCookieConsent(value: CookieConsent) {
    // store in HTTP COOKIE
    document.cookie = `cookie_consent=n%3D${value.necessary}%2Cp%3D${value.performance}%2Cf%3D${value.functional}%2Ct%3D${value.targeting}%2Cts%3D${value.updatedAt}; path=/; domain=${domain_name_root}; max-age=31536000; secure`;
    // store a copy in IndexedDB
    await db.put('config', value, 'cookieConsent');
    // reset the cache
    consentCache = null;
}

export const createBaseCookieConsent = () : CookieConsent => ({
    isCookieConsentType: true,
    updatedAt: 0,
    necessary: true,
    performance: false,
    functional: false,
    targeting: false,
});

export const parseCookieConsentFromHttpCookie = (cookieConsent: string) => {
    const parts = decodeURIComponent(cookieConsent).split(',');
    const map = {
        'n': 'necessary',
        'p': 'performance',
        'f': 'functional',
        't': 'targeting',
        'ts': 'updatedAt',
    } as Record<string, keyof CookieConsent>;
    const result = createBaseCookieConsent();
    try {
        for (const part of parts) {
            const [key, value] = part.split('=');
            if (!key || !value) continue;
            if (map[key]) {
                (result as any)[map[key]] = JSON.parse(value); // for number and boolean literal, JSON.parse will return the correct type
            }
        }
        return result;
    }
    catch { return null }
};

export const loadCookieConsentFromHttpCookie = async () => {
    try {
        const { parse } = await import('cookie');
        const cookies = parse(globalThis.document.cookie);
        if (!cookies["cookie_consent"]) return null;
        const cookieConsent = cookies["cookie_consent"];
        return parseCookieConsentFromHttpCookie(cookieConsent);
    }
    catch { return null }
};

export async function getSafeCookieConsent() { 
    return (await getCookieConsent()) ?? createBaseCookieConsent();
}

// --------

export async function isNecessaryCookieConsented() {
    return (await getSafeCookieConsent()).necessary;
}

export async function isPerformanceCookieConsented() {
    return (await getSafeCookieConsent()).performance;
}

export async function isFunctionalCookieConsented() {
    return (await getSafeCookieConsent()).functional;
}

export async function isTargetingCookieConsented() {
    return (await getSafeCookieConsent()).targeting;
}



