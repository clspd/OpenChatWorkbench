const ALLOWED_ORIGINS = [
    "https://openchatworkbench.com",
    "https://chat.openchatworkbench.com",
    "https://canary.openchatworkbench.com",
];

const VALID_JSON_TYPE = ['string', 'number', 'boolean'];
const SERIALIZABLE_JSON_TYPE = ['string', 'number', 'boolean', 'object'];

let SLSUrl;

/* ------------------ IP 处理 ------------------ */

function ipv4ToHextets(ipv4) {
    const octets = ipv4.split('.').map(n => parseInt(n, 10));
    if (octets.length !== 4 || octets.some(n => isNaN(n))) return null;
    const high = ((octets[0] << 8) | octets[1]) >>> 0;
    const low = ((octets[2] << 8) | octets[3]) >>> 0;
    return [high.toString(16), low.toString(16)];
}

function expandIPv6ToHextets(ip) {
    if (!ip) return null;
    ip = ip.trim();

    let ipv4Part = null;
    const lastColon = ip.lastIndexOf(':');
    if (ip.includes('.') && lastColon !== -1) {
        const possibleIpv4 = ip.slice(lastColon + 1);
        const h = ipv4ToHextets(possibleIpv4);
        if (h) {
            ipv4Part = h;
            ip = ip.slice(0, lastColon);
        }
    }

    if (ip.includes('::')) {
        const [left, right] = ip.split('::');
        const leftParts = left ? left.split(':').filter(Boolean) : [];
        const rightParts = right ? right.split(':').filter(Boolean) : [];
        let middleCount = 8 - (leftParts.length + rightParts.length + (ipv4Part ? 2 : 0));
        if (middleCount < 0) middleCount = 0;
        const middle = new Array(middleCount).fill('0');
        const full = [...leftParts, ...middle, ...rightParts];
        if (ipv4Part) full.push(...ipv4Part);
        while (full.length < 8) full.push('0');
        return full.slice(0, 8);
    }

    const parts = ip.split(':').filter(Boolean);
    let full = parts.slice();
    if (ipv4Part) full.push(...ipv4Part);
    while (full.length < 8) full.push('0');
    return full.slice(0, 8);
}

function truncateIp(ip) {
    if (!ip || ip === 'unknown') return 'unknown';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    if (ip.includes('.') && !ip.includes(':')) {
        const parts = ip.split('.');
        if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        return 'unknown';
    }

    if (ip.includes(':')) {
        const h = expandIPv6ToHextets(ip);
        if (!h) return 'unknown';
        return `${h[0]}:${h[1]}:${h[2]}::`;
    }

    return 'unknown';
}

/* ------------------ UA 处理（优先 Client Hints） ------------------ */

function parseClientHints(headers) {
    const secChUa = headers.get('sec-ch-ua');
    const secChPlatform = headers.get('sec-ch-ua-platform');
    const secChMobile = headers.get('sec-ch-ua-mobile');

    if (!secChUa && !secChPlatform) return null;

    const result = {
        browser: 'unknown',
        browser_major: null,
        os: 'unknown',
        device: 'unknown'
    };

    if (secChUa) {
        const m = secChUa.match(/"([^"]+)"\s*;\s*v\s*=\s*"(\d+)/);
        if (m) {
            result.browser = m[1];
            result.browser_major = parseInt(m[2], 10);
        }
    }

    if (secChPlatform) {
        result.os = secChPlatform.replace(/(^"|"$)/g, '');
    }

    if (secChMobile) {
        result.device = secChMobile.includes('?1') ? 'mobile' : 'desktop';
    }

    return result;
}

function reduceUserAgentFallback(ua) {
    if (!ua) return { browser: 'unknown', os: 'unknown', device: 'unknown' };

    const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
    const m = ua.match(/([A-Za-z]+)\/(\d+)/);
    return {
        browser: m ? m[1] : 'unknown',
        browser_major: m ? parseInt(m[2], 10) : null,
        os: 'unknown',
        device
    };
}

/* ------------------ CSP 数据清洗 ------------------ */

function stripUrl(url) {
    try {
        const u = new URL(url);
        return `${u.origin}${u.pathname}`;
    } catch {
        return url.slice(0, 256);
    }
}

function transformCspReport(data) {
    const newData = Object.create(null);

    for (const k of Reflect.ownKeys(data)) {
        const v = Reflect.get(data, k);

        if (v == null) {
            newData[k] = "";
            continue;
        }

        let value = v;

        if (typeof v === 'string' && v.startsWith('http')) {
            value = stripUrl(v);
        }

        if (VALID_JSON_TYPE.includes(typeof value)) {
            newData[k] = String(value).slice(0, 512);
        } else if (SERIALIZABLE_JSON_TYPE.includes(typeof value)) {
            newData[k] = JSON.stringify(value).slice(0, 1024);
        } else {
            newData[k] = String(value).slice(0, 512);
        }
    }

    return newData;
}

function minuteIsoNow() {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString();
}

/* ------------------ 主逻辑 ------------------ */

async function handleCSPReport(request, origin) {
    try {
        const rawData = await request.json();
        const cspData = rawData.type === 'csp-violation'
            ? rawData.body
            : rawData['csp-report'];

        if (!cspData) throw new Error('Invalid Data');

        const rawIp =
            request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-forwarded-for') ||
            'unknown';

        const clientIP = truncateIp(rawIp);

        let uaReduced = parseClientHints(request.headers);
        if (!uaReduced) {
            uaReduced = reduceUserAgentFallback(
                request.headers.get('user-agent') || ''
            );
        }

        const referer = request.headers.get('referer');
        const refererOrigin = referer ? stripUrl(referer) : '';

        const host = request.headers.get('host') ?? 'unknown';

        const slsData = {
            __topic__: 'csp-report',
            __source__: host,
            __logs__: [
                Object.assign(transformCspReport(cspData), {
                    client_ip_truncated: clientIP,
                    user_agent_reduced: uaReduced,
                    referer_origin: refererOrigin,
                    cf_country: request.headers.get('cf-ipcountry') || '',
                    cf_ray: request.headers.get('cf-ray') || '',
                    timestamp: minuteIsoNow()
                })
            ]
        };

        const slsResponse = await fetch(SLSUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slsData)
        });

        if (!slsResponse.ok) {
            return new Response(await slsResponse.text(), {
                status: 500,
                headers: buildBaseHeaders(origin)
            });
        }

        return new Response(null, {
            status: 204,
            headers: buildBaseHeaders(origin)
        });

    } catch {
        return new Response(null, {
            status: 400,
            headers: buildBaseHeaders(origin)
        });
    }
}

function buildBaseHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
    };
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get('origin');

        if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
            return new Response(null, { status: 403 });
        }

        SLSUrl = env.SLS_URL;

        if (url.pathname !== '/csp-report') {
            return new Response('Not Found', {
                status: 404,
                headers: buildBaseHeaders(origin)
            });
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: buildBaseHeaders(origin)
            });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {
                status: 405,
                headers: buildBaseHeaders(origin)
            });
        }

        return handleCSPReport(request, origin);
    }
};
