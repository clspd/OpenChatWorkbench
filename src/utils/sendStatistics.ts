import { analytics_base_url, domain_name_backup, domain_name_canary, domain_name_stable } from "@/config";
import { isPerformanceCookieConsented } from "./cookieConsent";
import { db } from "@/userdata";
import { DYNDATA } from "@/dynamic";

// usage report, categoried into Legitimate Interest, but the user can opt out
export async function sendUsageReport(data: string) {
    if (true === await db.get('config', 'user.privacy.optOutUsageReport')) return;
    navigator.sendBeacon(new URL('./usage-report', analytics_base_url), data);
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


// api for app
export async function AppSendGeneralReport() {
    const lastSentTs = Number(await db.get('cache', 'usage_report_last_sent'));
    if (!isNaN(lastSentTs) && (Date.now() - lastSentTs) < (1000 * 3600 * 6)) return;
    await db.put('cache', Date.now(), 'usage_report_last_sent');

    if (window.location.hostname === domain_name_canary) {
        const { showCanaryWarning, addCanaryWatermark, addRevHash } = await import('@/utils/canaryEnv');
        showCanaryWarning();
        (window as any).removeCanaryWatermark = addCanaryWatermark();
        addRevHash();
        sendUsageReport('An user is using the canary version of OpenChatWorkbench. Version is ' + DYNDATA.commithash).catch(e => console.log('[statistics] Failed to send usage report:' + e));
    }
    else if (window.location.hostname === domain_name_stable) {
        sendUsageReport('An user is using the stable version of OpenChatWorkbench. Version is ' + DYNDATA.commithash).catch(e => console.log('[statistics] Failed to send usage report:' + e));
    }
    else if (domain_name_backup.includes(window.location.hostname)) {
        sendUsageReport('An user is using one of the backup versions of OpenChatWorkbench. Version is ' + DYNDATA.commithash + ' and host is ' + window.location.hostname).catch(e => console.log('[statistics] Failed to send usage report:' + e));
    }
}

