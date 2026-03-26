import { h, ref, computed, type Component } from 'vue';
import { notification, Progress } from 'ant-design-vue';
import { LoadingOutlined } from '@ant-design/icons-vue';


export interface ProgressNotification {
    readonly key: string;
    close: () => void;
    update: (newValue: number) => void;
    updateConfig: (min: number, max: number, value: number) => void;
    updateText: (text: string, title?: string) => void;
}


export function createProgressNotification(
    title: string,
    text: string,
    min = 0,
    max = 100,
    value = 0,
    icon?: Component,
    closableByUser = false
): ProgressNotification {
    const notificationKey = crypto.randomUUID(); const titleRef = ref(title);
    const textRef = ref(text);
    const minRef = ref(min);
    const maxRef = ref(max);
    const valueRef = ref(value);
    const percentRef = computed(() => {
        const range = maxRef.value - minRef.value;
        if (range === 0) return 0;
        const calculated = ((valueRef.value - minRef.value) / range) * 100;
        return Math.max(0, Math.min(100, calculated));
    });
    notification.open({
        key: notificationKey,
        message: () => titleRef.value,
        icon: icon ? () => h(icon) : undefined,
        duration: 0,
        onClose: () => {
            if (!closableByUser) {
                return new Promise(() => { });
            }
        },
        description: () => {
            return h(
                'div',
                { style: { marginTop: '12px' } },
                [
                    h(
                        'div',
                        {
                            style: {
                                marginBottom: '8px',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                            },
                        },
                        textRef.value
                    ),
                    h(Progress, {
                        percent: percentRef.value,
                        size: 'small',
                    }),
                ]
            );
        },
    }); return {
        get key() {
            return notificationKey;
        },
        close: () => {
            notification.close(notificationKey);
        },
        update: (newValue: number) => {
            valueRef.value = newValue;
        },
        updateConfig: (min: number, max: number, value: number) => {
            minRef.value = min;
            maxRef.value = max;
            valueRef.value = value;
        },
        updateText: (text: string, title?: string) => {
            textRef.value = text;
            if (title !== undefined) {
                titleRef.value = title;
            }
        },
    };
}
