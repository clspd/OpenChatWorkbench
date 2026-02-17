if (!navigator.cookieEnabled || !(() => {
    try { return document.cookie.includes('sys.cookies.enabled=true') }
    catch { return false }
})()) {
    const { createApp } = await import('vue');
    const CookiesDisabledView = await import('./views/CookiesDisabledView.vue');
    createApp(CookiesDisabledView.default).mount(document.body.appendChild(document.createElement('div')));
}