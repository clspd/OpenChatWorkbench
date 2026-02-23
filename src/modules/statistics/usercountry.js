const ALLOWED_ORIGINS = [
    "https://openchatworkbench.com",
    "https://chat.openchatworkbench.com",
    "https://canary.openchatworkbench.com",
];

export default {
    /**
     * @param {Request} request
     */
    async fetch(request) {
        const o = request.headers.get("Origin") ?? '';
        if ((o && !ALLOWED_ORIGINS.includes(o)) || (request.method !== 'OPTIONS' && request.method !== 'GET')) return new Response(null, {
            status: 403,
        });
        if (request.method === 'OPTIONS') return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': o,
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin',
            }
        })
        return new Response(request.headers.get("CF-IPCountry"), {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': o,
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin',
            }
        });
    }
};