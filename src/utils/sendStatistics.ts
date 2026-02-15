import { analytics_base_url } from "@/config";
import { isPerformanceCookieConsented } from "./cookieConsent";
import { db } from "@/userdata";

// usage report, categoried into Legitimate Interest, but the user can opt out
export async function sendUsageReport(data: string) {
    if (true === await db.get('config', 'user.privacy.optOutUsageReport')) return;
    // const response = await fetch(new URL('./usage-report', analytics_base_url), {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'text/plain',
    //     },
    //     body: data,
    // });
    navigator.sendBeacon(new URL('./statistics-report', analytics_base_url), data);
}


// generic statistics report, categorized into Performance cookies, user can opt-out in Cookies settings
export async function sendStatisticsReport(data: string | object) {
    if (!await isPerformanceCookieConsented()) return;
    const dataType = typeof data === 'string' ? 'text/plain' : 'application/json';
    if (!data) throw new Error('Data is empty');
    if (typeof data === 'object' && data !== null) data = JSON.stringify(data);
    const response = await fetch(new URL('./statistics-report', analytics_base_url), {
        method: 'POST',
        headers: { 'Content-Type': dataType },
        body: data,
    });
    if (!response.ok) throw new Error(`Failed to send statistics report: ${response.statusText}`);
}

