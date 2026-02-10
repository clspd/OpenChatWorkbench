import { Checkbox, Modal } from "ant-design-vue";
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { db } from '@/userdata';

export async function showCanaryWarning() {
    const doNotShow = await db.get('kv', 'canaryWarning.doNotShowAgain');
    if (doNotShow) return;

    const doNotShowAgain = ref(false);

    const modal = Modal.confirm({
        title: 'Canary Builds Disclaimer',
        content: h(defineComponent({
            setup() {
                const check = ref(false);
                const time = ref(5), timerId = ref<ReturnType<typeof setInterval>>();
                const timerText = computed(() => time.value ? ` (${time.value})` : '');

                onMounted(() => timerId.value = setInterval(() => {
                    if (time.value > 0) --time.value;
                }, 1000));
                onBeforeUnmount(() => clearInterval(timerId.value));

                const updateOkButton = () => {
                    modal.update({
                        okButtonProps: {
                            disabled: !check.value
                        }
                    });
                };
                return () => h('div', {}, [
                    h('div', null, 'You are using the canary build of the application, which is not reliable.'),
                    h('div', null, 'Canary builds are unstable, experimental versions intended for testing and development purposes only.'),
                    h('ul', null, [
                        h('li', null, [
                            h('b', null, 'No Stability or Availability Guarantee'),
                            h('span', null, ': These builds may contain bugs, crash frequently, and features may be incomplete or broken.'),
                        ]),
                        h('li', null, [
                            h('b', null, "Data Loss Risk"),
                            h('span', null, ": The application's data structure may change at any time without prior notice, deleting your old data without informing you. Using Canary builds can lead to permanent data loss or corruption."),
                        ]),
                        h('li', null, [
                            h('b', null, 'Not for Regular Use'),
                            h('span', null, ': '),
                            h('b', null, 'DO NOT \u2060'),
                            h('span', null, 'use Canary builds for any critical work or with important data.'),
                        ]),
                    ]),
                    h('div', { style: { fontWeight: 'bold' } }, 'Recommendation for Normal Users:'),
                    h('div', null, [
                        h('span', null, 'For a stable and reliable experience, please use the official '),
                        h('a', { href: window.location.href.replace('canary.', 'chat.'), target: '_self' }, 'Stable Release'),
                        h('span', null, '.'),
                    ]),
                    h('hr'),
                    h('div', { style: { display: 'block', marginBottom: '8px' } }, [
                        h(Checkbox, {
                            disabled: !!time.value,
                            checked: check.value,
                            "onUpdate:checked": newVal => {
                                check.value = newVal;
                                updateOkButton();
                            },
                        }, () => h('span', null, "I've known the risks, continue to use canary build" + timerText.value)),
                    ]),
                    h('div', { style: { display: 'block' } }, [
                        h(Checkbox, {
                            disabled: !!time.value || !check.value,
                            checked: doNotShowAgain.value,
                            "onUpdate:checked": newVal => {
                                doNotShowAgain.value = newVal;
                            },
                        }, () => h('span', null, "Don't show this warning again" + timerText.value)),
                    ]),
                ])
            }
        })),
        okText: 'Continue',
        okType: 'danger',
        okButtonProps: { disabled: true },
        cancelText: 'Use stable build',
        style: 'position: fixed; inset: 10px; width: unset; overflow: auto;',
        async onOk() {
            if (doNotShowAgain.value) {
                await db.put('kv', true, 'canaryWarning.doNotShowAgain');
            }
            await new Promise(r => setTimeout(r, 1000));
        },
        onCancel() {
            window.location.href = (window.location.href.replace('canary.', 'chat.'))
            return new Promise(() => { });
        },
        centered: true,
        closable: false,
        maskClosable: false,
        keyboard: false,
    });
}

export function addCanaryWatermark() {
    const wm = document.createElement('div');
    wm.inert = true;
    wm.innerText = 'CANARY BUILD';
    wm.style.cssText = 'position: fixed; z-index: -1; color: rgba(204, 204, 204, 0.5); font-size: 3rem; rotate: 45deg; left: 50%; top: 50%; transform: translate(-50%, -50%); user-select: none;';
    document.body.appendChild(document.createElement('div')).attachShadow({ mode: 'closed' }).append(wm);
    // @ts-ignore
    return () => (wm.parentNode?.host?.remove());
}
