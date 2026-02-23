export interface CookieConsent {
    isCookieConsentType: true;
    updatedAt: number;
    necessary: boolean; // Always active
    performance: boolean; // Whether to use performance cookies
    functional: boolean; // Whether to use functional cookies
    targeting: boolean; // Whether to use targeting cookies
}