import { isPerformanceCookieConsented } from "./cookieConsent";
import { sendStatisticsReport } from "./sendStatistics";

export async function setupErrorHandler() {
    if (!await isPerformanceCookieConsented()) return;
    if (['localhost', '127.0.0.1', '::1'].includes(location.hostname)) return; // do not send in development environment
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleWindowUnhandledRejection);
}

async function handleWindowError(e: ErrorEvent) {
    if (!await isPerformanceCookieConsented()) return;
    // Send a report
    await sendStatisticsReport({
        type: 'runtime-error',
        errorType: 'error',
        errorMessage: e.message,
        ctx: {
            fileName: e.filename,
            lineNumber: e.lineno,
            columnNumber: e.colno,
            stack: e.error.stack || 'unknown',
        },
    }).catch(e => {});
}
async function handleWindowUnhandledRejection(e: PromiseRejectionEvent) {
    if (!await isPerformanceCookieConsented()) return;
    // Send a report
    let reason = e.reason
    try {
        if (reason && typeof reason === 'object') reason = JSON.stringify(reason);
        else reason = String(reason);
    }
    catch { reason = String(reason); }
    await sendStatisticsReport({
        type: 'runtime-error',
        errorType: 'error',
        errorMessage: reason,
        ctx: {
            promise: String(e.promise)
        },
    }).catch(e => {});
}
