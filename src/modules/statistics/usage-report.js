const ALLOWED_ORIGINS = [
    "https://openchatworkbench.com",
    "https://chat.openchatworkbench.com",
    "https://canary.openchatworkbench.com",
];

let slsUrl = '';

/** helper: 将 IPv4 字符串 -> 两个 hextet（用于 IPv4-in-IPv6 情形） */
function ipv4ToHextets(ipv4) {
    const octets = ipv4.split('.').map(n => parseInt(n, 10));
    if (octets.length !== 4 || octets.some(n => isNaN(n))) return null;
    const high = ((octets[0] << 8) | octets[1]) >>> 0;
    const low  = ((octets[2] << 8) | octets[3]) >>> 0;
    return [high.toString(16), low.toString(16)];
}

/** 将 IPv6 地址扩展成 8 个 hextet 的数组（字符串形式，不补零前导） */
function expandIPv6ToHextets(ip) {
    if (!ip) return null;
    ip = ip.trim();

    // 如果包含 IPv4 结尾（如 ::ffff:192.0.2.128），把 IPv4 部分单独处理
    let ipv4Part = null;
    const lastDot = ip.lastIndexOf('.');
    if (lastDot !== -1) {
        // 可能带 IPv4，找到最后一个冒号前的部分
        const lastColon = ip.lastIndexOf(':');
        const possibleIpv4 = ip.slice(lastColon + 1);
        if (possibleIpv4 && possibleIpv4.includes('.')) {
            // 校验
            const hext = ipv4ToHextets(possibleIpv4);
            if (hext) {
                ipv4Part = hext;
                // 去掉 IPv4 文本，保留前面的 IPv6 部分（可能包含 ::）
                ip = ip.slice(0, lastColon);
            }
        }
    }

    // 现在处理常规 IPv6 的扩展
    if (ip.includes('::')) {
        const [left, right] = ip.split('::');
        const leftParts = left ? left.split(':').filter(p => p.length > 0) : [];
        const rightParts = right ? right.split(':').filter(p => p.length > 0) : [];
        let middleCount = 8 - (leftParts.length + rightParts.length + (ipv4Part ? 2 : 0));
        if (middleCount < 0) middleCount = 0; // 防御性
        const middle = new Array(middleCount).fill('0');
        const full = [...leftParts, ...middle, ...rightParts];
        if (ipv4Part) full.push(...ipv4Part);
        // 如果长度仍然不足，右侧补零
        while (full.length < 8) full.push('0');
        return full.slice(0, 8).map(h => h.toLowerCase());
    } else {
        // 无 :: 的情形
        const parts = ip.split(':').filter(p => p.length > 0);
        let full = parts.slice();
        if (ipv4Part) full.push(...ipv4Part);
        while (full.length < 8) full.push('0');
        return full.slice(0, 8).map(h => h.toLowerCase());
    }
}

/** 截断 IP（不可逆）：IPv4 -> 保留前三段并置最后一段为 0；IPv6 -> 保留前三个 hextet 并补 :: */
function truncateIp(ip) {
    if (!ip || ip === 'unknown') return 'unknown';

    // 如果有逗号 (X-Forwarded-For)，只取第一个非空项
    if (ip.includes(',')) ip = ip.split(',').map(s => s.trim()).find(Boolean) || ip;

    // IPv4
    if (ip.includes('.') && !ip.includes(':')) {
        const octets = ip.trim().split('.');
        if (octets.length === 4 && octets.every(o => o !== '')) {
            return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
        }
        return 'unknown';
    }

    // IPv6 (包含带 IPv4 的映射形式)
    if (ip.includes(':')) {
        const hextets = expandIPv6ToHextets(ip);
        if (!hextets) return 'unknown';
        // 保留前三个 hextet（填充为小写），然后使用 :: 表示后续
        return `${hextets[0]}:${hextets[1]}:${hextets[2]}::`;
    }

    return 'unknown';
}

/** 解析 Sec-CH-* Client Hints 优先，如无则回退到 UA 字符串解析 */
function parseClientHints(headers) {
    // headers: Request.headers
    const ch = {};

    // 常见 Client Hints:
    // sec-ch-ua: "\"Chromium\";v=\"117\", \"Not A;Brand\";v=\"24\""
    // sec-ch-ua-mobile: "?0" or "?1"
    // sec-ch-ua-platform: "Android"
    // sec-ch-ua-platform-version: "14.0.0"
    // sec-ch-ua-full-version: "117.0.5938.92"
    const secChUa = headers.get('sec-ch-ua') || headers.get('sec-ch-ua-full') || '';
    const secChUaMobile = headers.get('sec-ch-ua-mobile') || headers.get('sec-ch-ua-mobile?') || '';
    const secChPlatform = headers.get('sec-ch-ua-platform') || '';
    const secChPlatformVersion = headers.get('sec-ch-ua-platform-version') || '';
    const secChFullVersion = headers.get('sec-ch-ua-full-version') || '';

    if (secChUa) {
        // 取第一个 "Brand";v="xx"
        const m = secChUa.match(/"([^"]+)"\s*;\s*v\s*=\s*"(\d+)/);
        if (m) {
            ch.browser = m[1];
            ch.browser_major = parseInt(m[2], 10);
        }
    }
    if (secChFullVersion && !ch.browser_major) {
        const mf = secChFullVersion.match(/^(\d+)/);
        if (mf) ch.browser_major = parseInt(mf[1], 10);
    }
    if (secChPlatform) {
        // 字符串可能带引号
        ch.os = secChPlatform.replace(/(^"|"$)/g, '');
        if (secChPlatformVersion) {
            const mp = secChPlatformVersion.match(/^"?(?<v>\d+)/);
            if (mp && mp.groups && mp.groups.v) ch.os_major = parseInt(mp.groups.v, 10);
        }
    }
    if (secChUaMobile) {
        ch.device = secChUaMobile.includes('?1') ? 'mobile' : 'desktop';
    }

    // 如果至少拿到了 browser 或 os 信息，就返回
    if (ch.browser || ch.os) return {
        browser: ch.browser || 'unknown',
        browser_major: ch.browser_major || null,
        os: ch.os || 'unknown',
        os_major: ch.os_major || null,
        device: ch.device || 'unknown'
    };

    // 否则返回 null 以便 fallback
    return null;
}

/** 作为最后的回退：解析 user-agent（保留你之前的大部分逻辑） */
function reduceUserAgentFallback(ua) {
    if (!ua || ua === 'unknown') return { browser: 'unknown', browser_major: null, os: 'unknown', os_major: null, device: 'unknown' };

    const low = ua.substring(0, 512);
    let browser = 'unknown', browser_major = null;
    let os = 'unknown', os_major = null;
    let device = /Mobile|Android|iPhone|iPad|Tablet/i.test(low) ? 'mobile' : 'desktop';

    const mFirefox = low.match(/Firefox\/(\d+)(?:\.\d+)?/i) || low.match(/rv:(\d+)\.\d+\).*Gecko/i);
    const mChrome = low.match(/Chrome\/(\d+)(?:\.\d+)?/i);
    const mEdg = low.match(/Edg\/(\d+)(?:\.\d+)?/i);
    const mSafari = (!mChrome && low.match(/Version\/(\d+)(?:\.\d+)?\s+Safari/i));
    const mOpera = low.match(/OPR\/(\d+)(?:\.\d+)?/i);

    if (mFirefox) { browser = 'Firefox'; browser_major = parseInt(mFirefox[1], 10); }
    else if (mEdg) { browser = 'Edge'; browser_major = parseInt(mEdg[1], 10); }
    else if (mOpera) { browser = 'Opera'; browser_major = parseInt(mOpera[1], 10); }
    else if (mChrome) { browser = 'Chrome'; browser_major = parseInt(mChrome[1], 10); }
    else if (mSafari) { browser = 'Safari'; browser_major = parseInt(mSafari[1], 10); }
    else {
        const m = low.match(/([A-Za-z]+)\/(\d+)/);
        if (m) { browser = m[1]; browser_major = parseInt(m[2], 10); }
    }

    const mAndroid = low.match(/Android\s+(\d+)(?:[._](\d+))?/i);
    const mIOS = low.match(/iPhone OS\s+(\d+)|iOS\s+(\d+)/i);
    const mWindows = low.match(/Windows NT\s+(\d+)(?:\.(\d+))?/i);
    const mMac = low.match(/Mac OS X\s+(\d+)(?:[_\.](\d+))?/i);
    const mLinux = low.match(/\bLinux\b/i);

    if (mAndroid) { os = 'Android'; os_major = parseInt(mAndroid[1], 10); device = /Mobile|Android/i.test(low) ? 'mobile' : 'tablet'; }
    else if (mIOS) { os = 'iOS'; os_major = parseInt(mIOS[1] || mIOS[2], 10); device = /iPhone/i.test(low) ? 'mobile' : 'tablet'; }
    else if (mWindows) { os = 'Windows'; os_major = parseInt(mWindows[1], 10); device = 'desktop'; }
    else if (mMac) { os = 'macOS'; os_major = parseInt(mMac[1], 10); device = 'desktop'; }
    else if (mLinux) { os = 'Linux'; device = 'desktop'; }

    return { browser, browser_major, os, os_major, device };
}

/** 对外米时间降到分钟精度 */
function minuteIsoNow() {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString();
}

/**
 * @param {Request} request
 * @param {string} origin
 */
async function handleUsageReport(request, origin) {
    try {
        // 取 IP 的优先头顺序：cf-connecting-ip -> x-forwarded-for -> unknown
        const rawIp = request.headers.get('cf-connecting-ip')
            || request.headers.get('x-forwarded-for')
            || 'unknown';
        const clientIP = truncateIp(rawIp);

        // 优先用 Client Hints（更可靠且更低指纹），没有则回退解析 UA
        let uaReduced = parseClientHints(request.headers);
        if (!uaReduced) {
            const rawUA = request.headers.get('user-agent') || 'unknown';
            uaReduced = reduceUserAgentFallback(rawUA);
        }

        // 只保留国家（cf-ipcountry）用于地域分析
        const country = request.headers.get('cf-ipcountry') || '';

        const text = await request.text();
        if (text.length > 4096) throw new Error('Request body is too large');

        const slsData = {
            __topic__: 'usage-report',
            __source__: 'usage-collector',
            __logs__: [{
                data: text,

                client_ip_truncated: clientIP,
                cf_country: country,
                user_agent_reduced: uaReduced,
                timestamp: minuteIsoNow()
            }]
        };

        const slsResponse = await fetch(slsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(slsData)
        });

        if (!slsResponse.ok) {
            const e = await slsResponse.text();
            console.error('SLS send failed:', e);
            return new Response(e, {
                status: 500,
                headers: buildBaseHeaders(origin)
            });
        }

        return new Response(null, {
            status: 204,
            headers: buildBaseHeaders(origin)
        });

    } catch (error) {
        console.error('usage-report error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 400,
            headers: Object.assign(buildBaseHeaders(origin), {
                'Content-Type': 'application/json',
            })
        });
    }
}

/**
 * @param {string} origin
 */
function buildBaseHeaders(origin) {
    return ({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url),
            origin = request.headers.get('origin');
        if (!origin || !ALLOWED_ORIGINS.includes(origin)) return new Response(null, {
            status: 403,
            headers: {
                'X-Blocked-Reason': 'Invalid-Origin'
            }
        });

        slsUrl = env.SLS_URL;

        if (url.pathname !== '/api/v1/usage-report') {
            return new Response('Not Found', {
                status: 404,
                headers: buildBaseHeaders(origin)
            });
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: Object.assign(buildBaseHeaders(origin), {
                    Allow: 'POST, OPTIONS',
                })
            });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {
                status: 405,
                headers: Object.assign(buildBaseHeaders(origin), {
                    Allow: 'POST, OPTIONS',
                })
            });
        }

        return handleUsageReport(request, origin);
    }
};
