const ALLOWED_ORIGINS = [
    "https://openchatworkbench.com",
    "https://chat.openchatworkbench.com",
    "https://canary.openchatworkbench.com",
];

let slsUrl = '';

/**
 * @param {Request} request
 * @param {string} origin
 */
async function handleUsageReport(request, origin) {
    try {
        const clientIP = request.headers.get('cf-connecting-ip') ?? 'unknown';
        const userAgent = request.headers.get('user-agent') ?? 'unknown';
        const referer = request.headers.get('referer') ?? '';
        const host = request.headers.get('host') ?? 'unknown';

        const text = await request.text();
        if (text.length > 4096) throw new Error('Request body is too large');

        const slsData = {
            __topic__: 'usage-report',
            __source__: host,
            __logs__: [{
                data: text,

                client_ip: clientIP,
                user_agent: userAgent,
                referer: referer,
                cf_country: request.headers.get('cf-ipcountry') || '',
                cf_ray: request.headers.get('cf-ray') || '',

                timestamp: new Date().toISOString(),
                cf_timestamp: new Date().toISOString()
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
        return new Response(null, {
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
    /**
     * @param {Request} request
     * @param {any} env
     * @param {any} ctx
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url),
            origin = request.headers.get('origin');
        if (!origin || !ALLOWED_ORIGINS.includes(origin)) return new Response(null, {
            status: 403,
            headers: {
                'X-Blocked-Reason': 'Invalid-Origin'
            }
        })

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