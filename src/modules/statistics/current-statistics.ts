import { isPerformanceCookieConsented } from "@/utils/cookieConsent";
import { sendStatisticsReport } from "@/utils/sendStatistics";

export default [

    // 2026-03-19: Add statistics code running on Chrome Android to collect usage data about multitabs (#16)
    async function () {
        if (!await isPerformanceCookieConsented()) return;

        const closingDate = 1775001600000; // 2026-04-01T00:00:00.000Z
        if ((new Date().getTime()) > closingDate) return;

        const ua = navigator.userAgent;
        const isTarget = /Android.*Chrom/i.test(ua);
        if (!isTarget) return;

        const isMultiTab = !await ((window as any)._isFirstInstance);
        if (!isMultiTab) return;

        await sendStatisticsReport(`An Android user is using Chromium-based browser with multiple tabs. User agent: ${ua}`);
    },

] as Array<() => Promise<void>>;
