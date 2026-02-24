export const setupHotKey = () => import('./hotkeys.ts').then((moduleHandle) => {
    const { default: ks, NoPrevent } = moduleHandle;
    globalThis.addEventListener('keydown', function (ev: KeyboardEvent) {
        const keys = [];
        if (ev.ctrlKey && ev.key !== 'Control') keys.push('Ctrl');
        if (ev.altKey && ev.key !== 'Alt') keys.push('Alt');
        if (ev.shiftKey && ev.key !== 'Shift') keys.push('Shift');
        keys.push(ev.key.length === 1 ? ev.key.toUpperCase() : ev.key);
        const key = keys.join('+');

        const fn = ks[key];
        if (fn) {
            const ret = fn.call(globalThis, ev, key);
            if (ret !== NoPrevent) ev.preventDefault();
        }
        return;
    });
});
