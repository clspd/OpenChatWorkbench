if (!navigator.cookieEnabled || !(() => {
    try { if (!document.cookie.includes('sys.cookies.enabled=true')) { document.cookie = 'sys.cookies.enabled=true; path=/; max-age=31536000; Secure'; return true } else return true }
    catch { return false }
})()) {
    const { createApp } = await import('vue');
    const CookiesDisabledView = await import('@/views/CookiesDisabledView.vue');
    createApp(CookiesDisabledView.default).mount(document.body.appendChild(document.createElement('div')));
}