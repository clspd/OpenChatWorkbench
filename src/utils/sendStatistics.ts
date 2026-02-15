import { analytics_base_url } from "@/config";
import { isPerformanceCookieConsented } from "./cookieConsent";
import { db } from "@/userdata";

// usage report, categoried into Legitimate Interest, but the user can opt out
export async function sendUsageReport(data: string) {
    if (true === await db.get('config', 'user.privacy.optOutUsageReport')) return;
    const response = await fetch(new URL('./usage-report', analytics_base_url), {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: data,
    });
    if (!response.ok) throw new Error(`Failed to send usage report: ${response.statusText}`);
}


// generic statistics report, categorized into Performance cookies, user can opt-out in Cookies settings
export async function sendStatisticsReport(data: string) {
    if (!await isPerformanceCookieConsented()) return;
    const response = await fetch(new URL('./statistics-report', analytics_base_url), {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: data,
    });
    if (!response.ok) throw new Error(`Failed to send statistics report: ${response.statusText}`);
}

