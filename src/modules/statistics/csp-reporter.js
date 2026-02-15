// src/modules/statistics/csp-reporter.js
/* eslint-disable no-undef */

/**
 * @typedef {Object} UAInfo
 * @property {string} browser
 * @property {number|null} browser_major
 * @property {string} os
 * @property {number|null} os_major
 * @property {string} device
 */

/**
 * CSP report collector — SLS-safe single-layer string values
 */

const ALLOWED_ORIGINS = [
    "https://openchatworkbench.com",
    "https://chat.openchatworkbench.com",
    "https://canary.openchatworkbench.com",
];

const VALID_JSON_TYPE = ['string', 'number', 'boolean'];
const SERIALIZABLE_JSON_TYPE = ['string', 'number', 'boolean', 'object'];

/** @type {string} */
let SLSUrl = '';

/**
 * Convert any value to SLS-acceptable string.
 * @param {unknown} v
 * @returns {string}
 */
function toStringForSls(v) {
    if (v === null || v === undefined) return '';
    const t = typeof v;
    if (t === 'string') return /** @type {string} */ (v);
    if (t === 'number' || t === 'boolean') return String(v);
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

/**
 * @param {string} ipv4
 * @returns {string[]|null}
 */
function ipv4ToHextets(ipv4) {
    if (typeof ipv4 !== 'string') return null;
    const octets = ipv4.split('.');
    if (octets.length !== 4) return null;
    const nums = octets.map(o => parseInt(o, 10));
    if (nums.length !== 4 || nums.some(n => Number.isNaN(n))) return null;
    // @ts-ignore
    const high = ((nums[0] << 8) | nums[1]) >>> 0; const low = ((nums[2] << 8) | nums[3]) >>> 0;
    return [high.toString(16), low.toString(16)];
}

/**
 * @param {string} ip
 * @returns {string[]|null}
 */
function expandIPv6ToHextets(ip) {
    if (typeof ip !== 'string' || ip.length === 0) return null;
    let s = ip.trim();
    let ipv4Part = null;
    if (s.includes('.') && s.includes(':')) {
        const lastColon = s.lastIndexOf(':');
        const possibleIpv4 = s.slice(lastColon + 1);
        const hext = ipv4ToHextets(possibleIpv4);
        if (hext) {
            ipv4Part = hext;
            s = s.slice(0, lastColon);
        }
    }

    if (s.includes('::')) {
        const [left, right] = s.split('::', 2);
        const leftParts = left ? left.split(':').filter(p => p.length > 0) : [];
        const rightParts = right ? right.split(':').filter(p => p.length > 0) : [];
        let fill = 8 - (leftParts.length + rightParts.length + (ipv4Part ? 2 : 0));
        if (fill < 0) fill = 0;
        const middle = new Array(fill).fill('0');
        const full = [...leftParts, ...middle, ...rightParts];
        if (ipv4Part) full.push(...ipv4Part);
        while (full.length < 8) full.push('0');
        return full.slice(0, 8).map(h => String(h).toLowerCase());
    } else {
        const parts = s.split(':').filter(p => p.length > 0);
        const full = parts.slice();
        if (ipv4Part) full.push(...ipv4Part);
        while (full.length < 8) full.push('0');
        return full.slice(0, 8).map(h => String(h).toLowerCase());
    }
}

/**
 * @param {string} ip
 * @returns {string}
 */
function truncateIp(ip) {
    if (!ip || typeof ip !== 'string') return 'unknown';
    if (ip.includes(',')) ip = ip.split(',').map(s => s.trim()).find(Boolean) || ip;

    if (ip.includes('.') && !ip.includes(':')) {
        const parts = ip.split('.');
        if (parts.length === 4 && parts.every(p => p.length > 0)) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
        return 'unknown';
    }

    if (ip.includes(':')) {
        const h = expandIPv6ToHextets(ip);
        if (!h) return 'unknown';
        return `${h[0]}:${h[1]}:${h[2]}::`;
    }

    return 'unknown';
}

/**
 * @param {Headers} headers
 * @returns {UAInfo|null}
 */
function parseClientHints(headers) {
    if (!headers || typeof headers.get !== 'function') return null;
    const secChUa = headers.get('sec-ch-ua') || '';
    const secChPlatform = headers.get('sec-ch-ua-platform') || '';
    const secChPlatformVersion = headers.get('sec-ch-ua-platform-version') || '';
    const secChFullVersion = headers.get('sec-ch-ua-full-version') || '';
    const secChMobile = headers.get('sec-ch-ua-mobile') || '';

    /** @type {UAInfo} */
    const result = { browser: 'unknown', browser_major: null, os: 'unknown', os_major: null, device: 'unknown' };

    if (secChUa) {
        const m = secChUa.match(/"([^"]+)"\s*;\s*v\s*=\s*"(\d+)/);
        if (m && m[1]) result.browser = m[1];
        if (m && m[2]) result.browser_major = Number.parseInt(m[2], 10) || null;
    }
    if (secChFullVersion && result.browser_major === null) {
        const mf = secChFullVersion.match(/^"?(?<v>\d+)/);
        if (mf && mf.groups && mf.groups.v) result.browser_major = Number.parseInt(mf.groups.v, 10) || null;
    }
    if (secChPlatform) {
        result.os = String(secChPlatform).replace(/(^"|"$)/g, '');
        if (secChPlatformVersion) {
            const mp = secChPlatformVersion.match(/^"?(?<v>\d+)/);
            if (mp && mp.groups && mp.groups.v) result.os_major = Number.parseInt(mp.groups.v, 10) || null;
        }
    }
    if (secChMobile) result.device = secChMobile.includes('?1') ? 'mobile' : 'desktop';

    if (result.browser !== 'unknown' || result.os !== 'unknown') return result;
    return null;
}

/**
 * @param {string} ua
 * @returns {UAInfo}
 */
function reduceUserAgentFallback(ua) {
    if (!ua || typeof ua !== 'string') return { browser: 'unknown', browser_major: null, os: 'unknown', os_major: null, device: 'unknown' };
    const low = ua.substring(0, 512);
    let browser = 'unknown', browser_major = null;
    let os = 'unknown', os_major = null;
    const device = /Mobile|Android|iPhone|iPad|Tablet/i.test(low) ? 'mobile' : 'desktop';

    const mFirefox = low.match(/Firefox\/(\d+)(?:\.\d+)?/i) || low.match(/rv:(\d+)\.\d+\).*Gecko/i);
    const mChrome = low.match(/Chrome\/(\d+)(?:\.\d+)?/i);
    const mEdg = low.match(/Edg\/(\d+)(?:\.\d+)?/i);
    const mSafari = (!mChrome && low.match(/Version\/(\d+)(?:\.\d+)?\s+Safari/i));
    const mOpera = low.match(/OPR\/(\d+)(?:\.\d+)?/i);

    if (mFirefox && mFirefox[1]) { browser = 'Firefox'; browser_major = Number.parseInt(mFirefox[1], 10) || null; }
    else if (mEdg && mEdg[1]) { browser = 'Edge'; browser_major = Number.parseInt(mEdg[1], 10) || null; }
    else if (mOpera && mOpera[1]) { browser = 'Opera'; browser_major = Number.parseInt(mOpera[1], 10) || null; }
    else if (mChrome && mChrome[1]) { browser = 'Chrome'; browser_major = Number.parseInt(mChrome[1], 10) || null; }
    else if (mSafari && mSafari[1]) { browser = 'Safari'; browser_major = Number.parseInt(mSafari[1], 10) || null; }
    else {
        const m = low.match(/([A-Za-z]+)\/(\d+)/);
        if (m && m[1] && m[2]) { browser = m[1]; browser_major = Number.parseInt(m[2], 10) || null; }
    }

    const mAndroid = low.match(/Android\s+(\d+)(?:[._](\d+))?/i);
    const mIOS = low.match(/iPhone OS\s+(\d+)|iOS\s+(\d+)/i);
    const mWindows = low.match(/Windows NT\s+(\d+)(?:\.(\d+))?/i);
    const mMac = low.match(/Mac OS X\s+(\d+)(?:[_\.](\d+))?/i);
    const mLinux = low.match(/\bLinux\b/i);

    if (mAndroid && mAndroid[1]) { os = 'Android'; os_major = Number.parseInt(mAndroid[1], 10) || null; }
    else if (mIOS && (mIOS[1] || mIOS[2])) { os = 'iOS'; os_major = Number.parseInt(mIOS[1] || mIOS[2] || '0', 10) || null; }
    else if (mWindows && mWindows[1]) { os = 'Windows'; os_major = Number.parseInt(mWindows[1], 10) || null; }
    else if (mMac && mMac[1]) { os = 'macOS'; os_major = Number.parseInt(mMac[1], 10) || null; }
    else if (mLinux) { os = 'Linux'; }

    return { browser, browser_major, os, os_major, device };
}

/**
 * Strip query and fragment from URL for CSP fields.
 * @param {string} url
 * @returns {string}
 */
function stripUrl(url) {
    try {
        const u = new URL(String(url));
        return `${u.origin}${u.pathname}`;
    } catch {
        if (typeof url === 'string') return url.slice(0, 256);
        return '';
    }
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Record<string, string>}
 */
function transformCspReport(data) {
    const out = Object.create(null);
    if (!data || typeof data !== 'object') return out;
    for (const k of Reflect.ownKeys(data)) {
        const v = Reflect.get(data, k);
        let val = v;
        if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
            val = stripUrl(v);
        }
        if (VALID_JSON_TYPE.includes(typeof val)) {
            out[String(k)] = toStringForSls(val).slice(0, 1024);
        } else if (SERIALIZABLE_JSON_TYPE.includes(typeof val)) {
            out[String(k)] = toStringForSls(val).slice(0, 2048);
        } else {
            out[String(k)] = toStringForSls(val).slice(0, 1024);
        }
    }
    return out;
}

/** @returns {string} minute-precision ISO */
function minuteIsoNow() {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString();
}

/**
 * @param {Request} request
 * @param {string} origin
 */
async function handleCSPReport(request, origin) {
    try {
        const rawData = /** @type {any} */ (await request.json());
        /** @type {Record<string, any>|undefined} */
        const cspData = rawData && rawData.type === 'csp-violation' ? rawData.body : (rawData && rawData['csp-report']);
        if (!cspData || typeof cspData !== 'object') throw new Error('Invalid Data');

        const rawIp = String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown');
        const clientIP = truncateIp(rawIp);

        /** @type {UAInfo|null} */
        let uaReduced = parseClientHints(request.headers);
        if (!uaReduced) uaReduced = reduceUserAgentFallback(String(request.headers.get('user-agent') || ''));

        // after fallback uaReduced must be UAInfo
        const ua = /** @type {UAInfo} */ (uaReduced);

        const referer = String(request.headers.get('referer') || '');
        const refererOrigin = referer ? stripUrl(referer) : '';

        const host = String(request.headers.get('host') || 'usage-collector');

        // base fields
        const base = transformCspReport(/** @type {Record<string, unknown>} */(cspData));
        const log = Object.create(null);

        for (const k of Object.keys(base)) log[String(k)] = toStringForSls(base[k]).slice(0, 2048);

        // flattened UA fields
        log.ua_browser = toStringForSls(ua.browser);
        log.ua_browser_major = ua.browser_major != null ? toStringForSls(ua.browser_major) : '';
        log.ua_os = toStringForSls(ua.os);
        log.ua_os_major = ua.os_major != null ? toStringForSls(ua.os_major) : '';
        log.ua_device = toStringForSls(ua.device);

        log.client_ip_truncated = toStringForSls(clientIP);
        log.referer_origin = toStringForSls(refererOrigin);
        log.cf_country = toStringForSls(request.headers.get('cf-ipcountry') || '');
        log.timestamp = toStringForSls(minuteIsoNow());

        const slsData = { __topic__: 'csp-report', __source__: host, __logs__: [log] };

        const slsResponse = await fetch(SLSUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slsData)
        });

        if (!slsResponse.ok) {
            const e = await slsResponse.text();
            console.error('SLS send failed:', e);
            return new Response(e, { status: 500, headers: buildBaseHeaders(origin) });
        }

        return new Response(null, { status: 204, headers: buildBaseHeaders(origin) });
    } catch (err) {
        console.error('csp-reporter error:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 400,
            headers: Object.assign(buildBaseHeaders(origin), { 'Content-Type': 'application/json' })
        });
    }
}

/**
 * @param {string} origin
 * @returns {Record<string,string>}
 */
function buildBaseHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
    };
}

export default {
    /**
     * @param {Request} request
     * @param {{SLS_URL?: string}} env
     */
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = String(request.headers.get('origin') || '');
        if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
            return new Response(null, { status: 403, headers: { 'X-Blocked-Reason': 'Invalid-Origin' } });
        }
        SLSUrl = env && env.SLS_URL ? String(env.SLS_URL) : '';
        if (url.pathname !== '/csp-report') {
            return new Response('Not Found', { status: 404, headers: buildBaseHeaders(origin) });
        }
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: buildBaseHeaders(origin) });
        }
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: buildBaseHeaders(origin) });
        }
        return handleCSPReport(request, origin);
    }
};
