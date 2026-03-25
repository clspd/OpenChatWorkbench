import { LitElement, html, css, type PropertyValues } from 'lit';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { message } from 'ant-design-vue';
import i18next, { t } from 'i18next';
import panzoom, { type PanZoom } from 'panzoom';
import mermaid from 'mermaid';
import { getSafeHTML } from '@/utils/htmlpurify';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    suppressErrorRendering: true,
    htmlLabels: false,
});

export const OCW_CODE_BLOCK_TAG_NAME = 'ocw-code-block' + ((window.customElements.get('ocw-code-block')) ?
    ('-' + crypto.randomUUID()) : '');

export class OcwCodeBlock extends LitElement {
    static styles = css`
    :host {
        display: block;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    :host {
        background-color: var(--code-bg, #f6f8fa);
        border-radius: 5px;
        padding: 0.5em;
        font-family: 'Consolas', 'Courier New', monospace;
        overflow: hidden;
        font-size: 0.9em;
    }

    .flexible-space {
        flex: 1;
    }

    .pre-renderer .header {
        display: flex;
        align-items: center;
        margin-bottom: 0.5em;
        padding-bottom: 0.5em;
        border-bottom: 1px solid var(--code-border, #e5e5e5);
        white-space: nowrap;
        user-select: none;
        overflow: hidden;
        flex-wrap: nowrap;
    }

    .pre-renderer .header .language {
        margin-right: 0.5em;
        padding-left: 0.5em;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .pre-renderer .content {
        padding: 0.5em;
        overflow: auto;
        white-space: pre;
    }

    .mermaid-renderer > .mermaid-error-banner {
        text-align: center;
        color: var(--mermaid-error-color, #cc0000);
    }

    .mermaid-renderer > .mermaid-error-detail {
        margin-top: 0.5em;
        color: var(--color-secondary, gray);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    `;

    static properties = {
        language: { type: String, reflect: true },
        wip: { type: Boolean, reflect: true },
        copied: { state: true },
    };

    declare copied: boolean;
    declare language: string;
    declare wip: boolean;
    #state: any;
    #observer: MutationObserver;

    constructor() {
        super();
        this.copied = false;
        this.language = '';
        this.wip = false;
        this.#state = null;
        this.#observer = new MutationObserver(() => this.myRenderContent());
    }

    private renderers: Record<string, () => ReturnType<typeof html>> = {
        default: () => html`<slot></slot>`,
        mermaid: () => html`<div class="mermaid-renderer">${(this.#state && this.#state.h) ? html`<div .innerHTML=${this.#state.h}></div>` : ((this.#state && this.#state.e && !this.wip) ? html`<div class="mermaid-error-banner">${t('chat:mermaid.errors.render')}</div><div class="mermaid-error-detail">${this.#state.d}</div>` : ((this.#state && this.#state.n && !this.wip) ? t('chat:mermaid.errors.empty') : t('chat:mermaid.rendering')))}</div>`,
    };

    private operationRenderers: Record<string, () => ReturnType<typeof html>> = {
        default: () => html`<sl-button size="small" ?disabled=${this.copied} @click=${this.copyContent}>${this.copied ? 'Copied' : 'Copy'}</sl-button><sl-button size="small" @click=${this.downloadContent}>Download</sl-button>`,
        mermaid: () => html``,
    };

    render() {
        return html`<div class="pre-renderer"><div class="header">
            <div class="language"><slot name="language"><span>${this.language}</span></slot></div>
            <div class="flexible-space"></div>
            <div class="operations">${(this.operationRenderers[this.language] ?? this.operationRenderers.default!)()}</div>
        </div><div class="content">${(this.renderers[this.language] ?? this.renderers.default!)()}</div></div>`;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.#observer.disconnect();
        this.#observer.observe(this, {
            characterData: true,
            subtree: true,
            childList: true,
        });
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#observer.disconnect();
    }

    protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
        await this.myRenderContent();
    }

    protected async myRenderContent() {
        switch (this.language) {
            case 'mermaid':
                await this.renderMermaid();
                break;
            default:
                this.#state = null;
        }
    }

    private async renderMermaid() {
        const code = this.textContent;
        if (!code) return (this.#state = { e: false, n: true }, void 0);

        try {
            const id = new Uint32Array(4);
            crypto.getRandomValues(id);
            const result = await mermaid.render('s-' + id.join('-'), code);
            this.#state = {
                e: false,
                h: getSafeHTML(result.svg, {
                    
                }, false)
            };
        } catch (e) {
            this.#state = { e: true, d: String(e) };
            console.debug(e)
        } finally {
            this.requestUpdate();
        }
    }

    private copyContent() {
        const content = this.textContent;
        if (content) {
            navigator.clipboard.writeText(content).then(() => {
                this.copied = true;
                setTimeout(() => this.copied = false, 2000);
            }).catch(e => {
                message.error('Failed to copy content: ' + e);
            });
        }
        else {
            message.error('No content to copy');
        }
    }

    private downloadContent() {
        const content = this.textContent;
        if (content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'code.txt';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => (document.body.removeChild(a), URL.revokeObjectURL(a.href)), 2000);
        }
        else {
            message.error('No content to download');
        }
    }

}

window.customElements.define(OCW_CODE_BLOCK_TAG_NAME, OcwCodeBlock);
