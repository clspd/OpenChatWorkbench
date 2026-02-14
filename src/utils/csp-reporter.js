const ALLOWED_ORIGINS = [
    "https://openchatworkbench.com",
    "https://chat.openchatworkbench.com",
    "https://canary.openchatworkbench.com",
];

const VALID_JSON_TYPE = 'string,number,boolean'.split(',');
const SERIALIZABLE_JSON_TYPE = 'string,number,boolean,object'.split(',');

const { getSLSUrl, setSLSUrl } = (function () {
    /**
     * @type {string}
     */
    let SLSUrl;
    return {
        getSLSUrl() {
            return SLSUrl;
        },
        /**
         * @param {string} url
         */
        setSLSUrl(url) {
            SLSUrl = url;
        },
    };
})();

/**
 * @param {object} data
 */
function transformCspReport(data) {
    const newData = Object.create(null);
    for (const k of Reflect.ownKeys(data)) {
        const v = Reflect.get(data, k);
        if (!v) newData[k] = null;
        else if (VALID_JSON_TYPE.includes(typeof v)) newData[k] = String(v);
        else if (SERIALIZABLE_JSON_TYPE.includes(typeof v)) newData[k] = JSON.stringify(v);
        else newData[k] = String(v);
    }
    return newData;
}

/**
 * @param {Request} request
 * @param {string} origin
 */
async function handleCSPReport(request, origin) {
    try {
        // parse CSP report
        const rawData = (await request.json());
        const cspData = (rawData.type === 'csp-violation' ?
            rawData.body : // Report API
            (rawData['csp-report'] ?? (() => {
                throw new Error('Invalid Data')
            })())
        );

        const clientIP = request.headers.get('cf-connecting-ip') ?? 'unknown';
        const userAgent = request.headers.get('user-agent') ?? 'unknown';
        const referer = request.headers.get('referer') ?? '';
        const host = request.headers.get('host') ?? 'unknown';

        const slsData = {
            __topic__: 'csp-report',
            __source__: host,
            __logs__: [Object.assign(transformCspReport(cspData), {
                client_ip: clientIP,
                user_agent: userAgent,
                cf_country: request.headers.get('cf-ipcountry') || '',
                cf_ray: request.headers.get('cf-ray') || '',

                timestamp: new Date().toISOString(),
                cf_timestamp: new Date().toISOString()
            })]
        };

        // 发送到阿里云 SLS
        const slsResponse = await fetch(getSLSUrl(), {
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
        
        setSLSUrl(env.SLS_URL);

        if (url.pathname !== '/csp-report') {
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

        return handleCSPReport(request, origin);
    }
};