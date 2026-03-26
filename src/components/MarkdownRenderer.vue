<template>
    <div
        class="renderer markdown-renderer renderer-main"
        v-bind="$attrs"
        ref="renderer"
        :data-isregular="isRegular"
        @click.capture="handleContentClick"
        @preview-svg="handlePreviewSvg"
    ></div>
</template>

<script lang="ts">
import addCSS from 'add-css-constructed';
import { load_katex } from '@/vendor/npm/katex';

const katex = await load_katex();

// randomize the class name so that malicious input cannot fake a styleful element
const [md_blank_line_spacer_name, remove] = (function () {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const md_blank_line_spacer_name = 'a-' + array.join('-');
    const { remove } = addCSS(`.renderer.markdown-renderer.renderer-main .${md_blank_line_spacer_name} {display: block}.renderer.markdown-renderer.renderer-main[data-isregular="true"] .${md_blank_line_spacer_name} {display: none}`);
    console.log('[MarkdownRenderer]', 'inject global stylesheet');
    return [md_blank_line_spacer_name, remove];
}());

const removes = [remove];

removes.push(...([
    
].map((v) => addCSS(v).remove)));

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        for (const i of removes) i();
    })
    import.meta.hot.accept()
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import MarkdownIt from 'markdown-it';
// @ts-ignore markdown-it-texmath@1.0.0 has no type definitions
import texmath from 'markdown-it-texmath';
import morphdom from 'morphdom';
import { getSafeHTML } from '@/utils/htmlpurify';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { OCW_CODE_BLOCK_TAG_NAME } from '@/modules/webcomponents/ocw-code-block';
import { previewImage } from '@/utils/imagePreview';
import '@/styles/markdown-beautify.css'

const router = useRouter();
const appStatePersist = useAppStatePersistStore();

const props = withDefaults(defineProps<{
    content: string;
    wip?: boolean;
    disabled?: boolean;
    mode?: 'full' | 'recommended' | 'disabled';
    trustSameOrigin?: boolean;
}>(), {
    wip: false,
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
    switch (renderMode.value) {
        case 'full':
            return getSafeHTML(md.render(props.content));
        case 'recommended':
            return getSafeHTML(mdRecommended.render(props.content));
        default:
            return props.content;
    }
});

const renderer = ref<HTMLDivElement>(), buffer = ref<HTMLDivElement>(document.createElement('div'));

const isRegular = ref(false);

const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
});

md.use(texmath, {
    engine: katex,
    delimiters: ['dollars', 'brackets'],
    throwOnError: false,
    errorColor: '#cc0000',
});

function preserveBlankLines(md: MarkdownIt) {
    md.core.ruler.after('block', 'preserve_blank_lines', (state) => {
        const out: any[] = []
        const Token = state.Token

        let prevEnd: number | null = null

        for (const token of state.tokens) {
            const isTopLevelBlock =
                token.block &&
                token.level === 0 &&
                token.map &&
                (
                    token.type.endsWith('_open') || 
                    token.type === 'fence' ||
                    token.type === 'code_block'
                )

            if (isTopLevelBlock) {
                if (prevEnd !== null) {
                    const blankLines = token.map![0] - prevEnd

                    if (blankLines > 0) {
                        const spacer = new Token('blank_line_spacer', '', 0)
                        spacer.block = true
                        spacer.level = 0
                        spacer.meta = { blankLines }
                        out.push(spacer)
                    }
                }

                prevEnd = token.map![1]
            }

            out.push(token)
        }

        state.tokens = out
    })

    md.renderer.rules.blank_line_spacer = (tokens, idx) => {
        const n = tokens[idx]?.meta?.blankLines ?? 1
        return `<div class="${md_blank_line_spacer_name}" data-size="${n}" style="height: ${n}lh"></div>\n`
    }
}

function preserveLeadingIndentation(md: MarkdownIt) {
    const expandIndent = (indent: string) => {
        let out = ''
        let col = 0

        for (const ch of indent) {
            if (ch === '\t') {
                const tabSize = 4
                const n = tabSize - (col % tabSize)
                out += '\u00A0'.repeat(n)
                col += n
            } else {
                out += '\u00A0'
                col += 1
            }
        }

        return out
    }

    md.core.ruler.after('inline', 'preserve_leading_indentation', (state) => {
        for (const token of state.tokens) {
            if (token.type !== 'inline' || !token.children) continue

            let atLineStart = true

            for (const child of token.children) {
                if (child.type === 'softbreak' || child.type === 'hardbreak') {
                    atLineStart = true
                    continue
                }

                if (child.type === 'text' && atLineStart && child.content) {
                    child.content = child.content.replace(/^[ \t]+/, (m) => expandIndent(m))
                }

                if (child.type === 'text' || child.type === 'code_inline') {
                    atLineStart = false
                }
            }
        }
    })
}

// Markdown-it instance for recommended mode (limited tags only)
const mdRecommended = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: false,
});
mdRecommended.use(preserveBlankLines);
mdRecommended.use(preserveLeadingIndentation);
mdRecommended.use(texmath, {
    engine: katex,
    delimiters: ['dollars', 'brackets'],
    throwOnError: false,
    errorColor: '#cc0000',
});

// Disable block-level rules except for lists, code blocks, and paragraphs
mdRecommended.block.ruler.disable([
    'blockquote', 'hr', 'heading', 'lheading', 'code'
]);

// Disable inline rules that are not in recommended list
mdRecommended.inline.ruler.disable([
    'image', 'autolink', 'html_inline'
]);

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
        const newCom = document.createElement(OCW_CODE_BLOCK_TAG_NAME);
        newCom.append(...i.childNodes);
        if (props.wip) newCom.setAttribute('wip', '');
        // no extra attributes is needed
        i.replaceWith(newCom);
    }
    for (const i of buffer.value.querySelectorAll(OCW_CODE_BLOCK_TAG_NAME + '>code[class]')) {
        const lang = /language-(\w+)/.exec(i.getAttribute('class') || '')?.[1];
        if (lang) {
            i.parentElement?.setAttribute("language", lang);
        }
    }
    
    isRegular.value = (buffer.value.querySelector(`.${md_blank_line_spacer_name}:not([data-size="1"]), p>br`) ? false : true);
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

const handlePreviewSvg = async (e: CustomEvent) => {
    if (!e.detail) return;
    e.preventDefault();

    const getElement = (str: string) => {
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.firstElementChild;
    };

    try {
        const svgData = new XMLSerializer().serializeToString(getElement(e.detail)!);
        const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml' }));
        previewImage(url, () => URL.revokeObjectURL(url));
    } catch (e) {
        message.error(String(e));
    }
}


</script>

<style scoped>
.renderer.markdown-renderer.renderer-main {
    white-space: normal;
}
</style>
