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
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import MarkdownIt from 'markdown-it';
import morphdom from 'morphdom'
import { getSafeHTML } from '@/utils/htmlpurify';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import '@/styles/markdown-beautify.css'
import '@/modules/webcomponents/ocw-markdown-component.ts'

const router = useRouter();
const appStatePersist = useAppStatePersistStore();

const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
});

// Markdown-it instance for recommended mode (limited tags only)
const mdRecommended = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: false,
});

// Disable block-level rules except for lists, code blocks, and paragraphs
mdRecommended.block.ruler.disable([
    'blockquote', 'hr', 'heading', 'lheading',
]);

// Disable inline rules that are not in recommended list
mdRecommended.inline.ruler.disable([
    'image', 'autolink', 'html_inline'
]);

const props = withDefaults(defineProps<{
    content: string;
    disabled?: boolean;
    mode?: 'full' | 'recommended' | 'disabled';
    trustSameOrigin?: boolean;
}>(), {
    disabled: false,
    mode: 'full',
    trustSameOrigin: false,
});

// For backward compatibility: if disabled prop is true, treat as 'disabled' mode
const renderMode = computed(() => {
    if (props.disabled) return 'disabled';
    return props.mode;
});

const html = computed(() => {
    if (renderMode.value === 'disabled') {
        return props.content;
    }
    
    const mdInstance = renderMode.value === 'recommended' ? mdRecommended : md;
    return getSafeHTML(mdInstance.render(props.content));
});

const renderer = ref<HTMLDivElement>(), buffer = ref<HTMLDivElement>(document.createElement('div'));

const update = () => {
    if (!renderer.value) {
        return;
    }
    
    if (renderMode.value === 'disabled') {
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
    for (const i of buffer.value.querySelectorAll('ocw-markdown-component>code[class]')) {
        const lang = /language-(\w+)/.exec(i.getAttribute('class') || '')?.[1];
        if (lang) {
            i.parentElement?.setAttribute("language", lang);
        }
    }
    morphdom(renderer.value, buffer.value, {
        childrenOnly: true,
        onBeforeElChildrenUpdated(fromEl, toEl) {
            return true
        },
    });
};

watch(() => html.value, update)

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
                    case 'http:':
                        if (
                            (props.trustSameOrigin && url.origin === window.location.origin) ||
                            (appStatePersist.chatInlineLinkTarget === 'inline') ||
                            (appStatePersist.chatInlineLinkTarget === 'newtab-when-isolated' && (!window.crossOriginIsolated))
                        ) {
                            router.push({
                                path: '/webview',
                                query: {
                                    src: url.href
                                }
                            });
                            break;
                        }
                        else {
                            window.open(url.href, '_blank', 'noopener,noreferrer');
                        }
                        break;
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
