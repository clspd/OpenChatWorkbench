import { t } from 'i18next';
import { h, ref } from 'vue'
import { Input, Modal } from 'ant-design-vue';
import { QuestionCircleOutlined } from '@ant-design/icons-vue';

export async function prompt(
    prompt: string,
    title: string,
    defaultValue?: string,
    type: "number" | "reset" | "submit" | "button" | "time" | "image" | "text" | "search" | "hidden" | "color" | "checkbox" | "radio" | "range" | "date" | "url" | "email" | "week" | "month" | "datetime-local" | "file" | "password" | "tel" = "text",
    okText = t("common:ui.dialog.ok"),
    cancelText = t("common:ui.dialog.cancel")
) {
    const value = ref(defaultValue ?? "");
    const content = h({
        render: () => h('div', null, [
            h('div', { style: { marginBottom: '0.5em' } }, prompt),
            h(Input, {
                type,
                value: value.value,
                "onUpdate:value": (newVal: string) => value.value = newVal,
            }),
        ]),
    });
    return await new Promise<string|null>((r) => Modal.confirm({
        title,
        content,
        okText,
        cancelText,
        icon: h(QuestionCircleOutlined, { style: { color: 'var(--color-primary, #1890ff)' } }),
        onOk: () => r(value.value),
        onCancel: () => r(null),
    }))
}