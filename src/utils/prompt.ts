import { Input, Modal } from 'ant-design-vue'
import { h, ref, type PropType } from 'vue'

export async function prompt(
    prompt: string,
    title: string,
    defaultValue?: string,
    type: "number" | "reset" | "submit" | "button" | "time" | "image" | "text" | "search" | "hidden" | "color" | "checkbox" | "radio" | "range" | "date" | "url" | "email" | "week" | "month" | "datetime-local" | "file" | "password" | "tel" = "text",
    okText = 'OK',
    cancelText = 'Cancel'
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
        onOk: () => r(value.value),
        onCancel: () => r(null),
    }))
}