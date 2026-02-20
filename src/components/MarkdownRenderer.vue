<template>
    <div
        class="renderer markdown-renderer renderer-main"
        v-bind="$attrs"
        ref="renderer"
        @click.capture="handleContentClick"
    ></div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { getSafeHTML } from '@/utils/htmlpurify';
import MarkdownIt from 'markdown-it';
import morphdom from 'morphdom'
import { message } from 'ant-design-vue';
import '@/styles/markdown-beautify.css'
import '@/modules/webcomponents/ocw-markdown-component.ts'

const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
});

const props = withDefaults(defineProps<{
    content: string;
    disabled?: boolean;
    trustSameOrigin?: boolean;
}>(), {
    disabled: false,
    trustSameOrigin: false,
});

const html = computed(() => {
    return getSafeHTML(md.render(props.content));
});

const renderer = ref<HTMLDivElement>(), buffer = ref<HTMLDivElement>(document.createElement('div'));

const update = () => {
    if (!renderer.value) {
        // console.warn("[MarkdownRenderer] renderer is not mounted");
        return;
    }
    if (props.disabled) {
        renderer.value.innerText = props.content; // when disabled, render plain text
        return;
    }
    buffer.value.innerHTML = html.value;
    for (const i of buffer.value.querySelectorAll('pre')) {
        const newCom = document.createElement("ocw-markdown-component");
        newCom.append(...i.childNodes);
        newCom.setAttribute("type", i.tagName.toLowerCase());
        // no extra attributes is needed
        i.replaceWith(newCom);
    }
    morphdom(renderer.value, buffer.value, {
        childrenOnly: true,
        onBeforeElChildrenUpdated(fromEl, toEl) {
            return true
        },
    });
};

watch(() => html.value, update, { immediate: true })
watch(() => props.disabled, update)

onMounted(() => {
    nextTick(() => update());
});

const handleContentClick = (e: PointerEvent) => {
    const target = e.target;
    if (!target || !(target instanceof HTMLElement)) {
        return;
    }
    switch (target.tagName) {
        case 'A':
            e.preventDefault();
            if (!target.hasAttribute('href')) {
                message.warn('Cannot open this link.');
                break;
            }
            try {
                const url = new URL((target as HTMLAnchorElement).href, window.location.href);
                switch (url.protocol) {
                    case 'https:':
                        if (props.trustSameOrigin && url.hostname === window.location.hostname) {
                            window.location.href = url.href;
                            break;
                        }
                        // [[fallthrough]]
                    case 'http:':
                    case 'mailto:':
                    case 'tel:':
                    case 'sms:':
                        window.open(url.href, '_blank', 'noopener,noreferrer');
                        break;
                    default:
                        message.warn(`Blocked a link element from opening ${url.protocol} URL because it may be a security risk.`);
                        break;
                }
            }
            catch { }
            break;
    }
}


</script>
