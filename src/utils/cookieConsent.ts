import { useAppStateStore } from "@/stores/appState";
import type { CookieConsent } from "@/types/cookieConsent";
import { db } from "@/userdata";

let cookieConsentUpdatedAt = 0;
export async function InitCookieConsent(updatedAt: number) {
    cookieConsentUpdatedAt = updatedAt;

    if (!(await isCookieConsentValid())) useAppStateStore().showCookieConsent = true;
}

export async function getCookieConsent() {
    const value = await db.get('config', 'cookieConsent');
    if (!value || !value.isCookieConsentType) return null;
    const typedValue = value as CookieConsent;
    return typedValue;
}

export async function isCookieConsentValid() {
    const cookieConsent = await getCookieConsent();
    if (!cookieConsent) return false;
    return cookieConsent.updatedAt === cookieConsentUpdatedAt;
}

export async function setCookieConsent(cookieConsent: CookieConsent) {
    await db.put('config', cookieConsent, 'cookieConsent');
}

export const createBaseCookieConsent = () : CookieConsent => ({
    isCookieConsentType: true,
    updatedAt: 0,
    necessary: true,
    performance: false,
    functional: false,
    targeting: false,
});

export async function getSafeCookieConsent() { 
    return await getCookieConsent() ?? createBaseCookieConsent();
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



