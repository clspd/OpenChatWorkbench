import { debounce } from 'lodash-es';
import { isPerformanceCookieConsented } from "./cookieConsent";
import { sendStatisticsReport } from "./sendStatistics";
import { db } from "@/userdata";

interface PendingReport {
    mergeKey: string;
    type: string;
    errorType: string;
    errorMessage: string;
    env: string;
    ctx: Record<string, any>;
    count: number;
    timestamp: number;
}

const STORAGE_PREFIX = 'applog::runtime/error/error_';
const INDEX_KEY = 'applog::runtime/error/error_index';
const FLUSH_DELAY_MS = 10000;

let pendingMap = new Map<string, PendingReport>();
let isFlushing = false;

function getMergeKey(report: Omit<PendingReport, 'mergeKey' | 'count' | 'timestamp'>): string {
    const ctxKey = report.errorType === 'error'
        ? `${report.ctx.fileName || ''}:${report.ctx.lineNumber || ''}:${report.ctx.columnNumber || ''}`
        : `${report.ctx.promise || ''}`;
    return `${report.type}|${report.errorType}|${report.errorMessage}|${report.env}|${ctxKey}`;
}

async function persistReport(mergeKey: string, report: PendingReport) {
    try {

        await db.put('tmp', report, `${STORAGE_PREFIX}${mergeKey}`);

        const index = await db.get('tmp', INDEX_KEY);
        const mergeKeys: string[] = index || [];
        if (!mergeKeys.includes(mergeKey)) {
            mergeKeys.push(mergeKey);
            await db.put('tmp', mergeKeys, INDEX_KEY);
        }
    } catch (e) {
        console.warn('[errorHandler] Failed to persist report:', e);
    }
}

async function deleteReport(mergeKey: string) {
    try {

        await db.delete('tmp', `${STORAGE_PREFIX}${mergeKey}`);

        const index = await db.get('tmp', INDEX_KEY);
        if (index && Array.isArray(index)) {
            const newIndex = index.filter((k: string) => k !== mergeKey);
            if (newIndex.length === 0) {
                await db.delete('tmp', INDEX_KEY);
            } else {
                await db.put('tmp', newIndex, INDEX_KEY);
            }
        }
    } catch (e) {
        console.warn('[errorHandler] Failed to delete report:', e);
    }
}

function addToQueue(baseReport: Omit<PendingReport, 'mergeKey' | 'count' | 'timestamp'>) {
    const mergeKey = getMergeKey(baseReport);
    const existing = pendingMap.get(mergeKey);

    if (existing) {

        existing.count++;

        persistReport(mergeKey, existing).catch(e => console.warn('[errorHandler] Persist update failed:', e));
    } else {

        const newReport: PendingReport = {
            ...baseReport,
            mergeKey,
            count: 1,
            timestamp: Date.now(),
        };
        pendingMap.set(mergeKey, newReport);

        persistReport(mergeKey, newReport).catch(e => console.warn('[errorHandler] Persist new failed:', e));
    }


    debouncedFlush();
}

async function flushQueue() {
    if (isFlushing) return;
    isFlushing = true;

    if (pendingMap.size === 0) {
        isFlushing = false;
        return;
    }

    const toSend = Array.from(pendingMap.values());

    pendingMap.clear();

    for (const report of toSend) {
        try {
            const reportCtx = { ...report.ctx, count: report.count };
            await sendStatisticsReport({
                type: report.type,
                errorType: report.errorType,
                errorMessage: report.errorMessage,
                env: report.env,
                ctx: reportCtx,
            });

            await deleteReport(report.mergeKey);
        } catch (e) {
            console.warn('[errorHandler] Failed to send report:', e);
            pendingMap.set(report.mergeKey, report);
        }
    }

    if (pendingMap.size > 0) {
        debouncedFlush();
    }

    isFlushing = false;
}

const debouncedFlush = debounce(() => {
    flushQueue().catch(e => console.warn('[errorHandler] Flush error:', e));
}, FLUSH_DELAY_MS);

async function restorePendingReports() {
    try {
        const index = await db.get('tmp', INDEX_KEY);
        if (!index || !Array.isArray(index)) return;

        const mergeKeys: string[] = index;
        const restoredReports: PendingReport[] = [];

        for (const mergeKey of mergeKeys) {
            const report = await db.get('tmp', `${STORAGE_PREFIX}${mergeKey}`);
            if (report && report.mergeKey) {
                restoredReports.push(report);
            }
        }

        for (const report of restoredReports) {
            const existing = pendingMap.get(report.mergeKey);
            if (existing) {
                existing.count += report.count;
            } else {
                pendingMap.set(report.mergeKey, report);
            }
        }

        if (pendingMap.size > 0) {
            debouncedFlush();
        }
    } catch (e) {
        console.warn('[errorHandler] Failed to restore pending errors:', e);
    }
}

async function handleWindowError(e: ErrorEvent) {
    if (!await isPerformanceCookieConsented()) return;
    if (!e) return;

    addToQueue({
        type: 'runtime-error',
        errorType: 'error',
        errorMessage: e.message ?? 'Unknown error',
        env: location.hostname,
        ctx: {
            fileName: e.filename,
            lineNumber: e.lineno,
            columnNumber: e.colno,
            stack: e.error?.stack || 'unknown',
        },
    });
}

async function handleWindowUnhandledRejection(e: PromiseRejectionEvent) {
    if (!await isPerformanceCookieConsented()) return;

    let reason = e.reason;
    try {
        if (reason && typeof reason === 'object') reason = JSON.stringify(reason);
        else reason = String(reason);
    } catch {
        reason = String(reason);
    }

    addToQueue({
        type: 'runtime-error',
        errorType: 'error',
        errorMessage: reason,
        env: location.hostname,
        ctx: {
            promise: String(e.promise),
        },
    });
}

export async function setupErrorHandler() {
    if (!await isPerformanceCookieConsented()) return;
    if (['localhost', '127.0.0.1', '::1'].includes(location.hostname)) return;

    restorePendingReports().catch(e => console.warn('[errorHandler] Restore failed:', e));

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleWindowUnhandledRejection);
}
