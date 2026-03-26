import { LitElement, html, css, type PropertyValues, unsafeCSS } from 'lit';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { message } from 'ant-design-vue';
import { t } from 'i18next';
import mermaid from 'mermaid';
import katex from 'katex';
import { getSafeHTML } from '@/utils/htmlpurify';
import { app_name_id } from '@/config';
import css1 from 'katex/dist/katex.min.css?inline';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    suppressErrorRendering: true,
    htmlLabels: false,
});

export const OCW_CODE_BLOCK_TAG_NAME = 'ocw-code-block' + ((window.customElements.get('ocw-code-block')) ?
    ('-' + crypto.randomUUID()) : '');

export const download_icon = '<svg  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64m384-253.696 236.288-236.352 45.248 45.248L508.8 704 192 387.2l45.248-45.248L480 584.704V128h64z"></path></svg>';

const getElement = (str: string) => {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.firstElementChild;
};

export class OcwCodeBlock extends LitElement {
    static styles = [
        css`
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
    }

    .flexible-space {
        flex: 1;
    }

    .pre-renderer > .header {
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

    .pre-renderer > .header > .language {
        margin-right: 0.5em;
        padding-left: 0.5em;
        font-size: 0.8em;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .pre-renderer > .header > .operations {
        display: flex;
        gap: 0.5em;
    }

    .pre-renderer > .header > .operations span.icon {
        display: flex;
    }

    .pre-renderer > .header > .operations span.icon > svg {
        width: 1em;
        height: 1em;
    }

    .pre-renderer > .content {
        padding: 0.5em;
        overflow: auto;
        white-space: pre;
    }

    .custom-renderer > .render-error-banner {
        text-align: center;
        color: var(--render-error-color, #cc0000);
    }

    .custom-renderer > .render-error-detail {
        margin-top: 0.5em;
        color: var(--color-secondary, gray);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .custom-renderer .katex {
        white-space: unset !important;
    }

    .mermaid-renderer > .render-content {
        display: flex;
    }

    .mermaid-renderer > .render-content > svg {
        margin: auto;
    }
        `,
        unsafeCSS(css1),
    ];

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
        mermaid: () => html`<div class="mermaid-renderer custom-renderer">${(this.#state && this.#state.h) ? html`<div class="render-content" .innerHTML=${this.#state.h}></div>` : ((this.#state && this.#state.e && !this.wip) ? html`<div class="render-error-banner">${t('chat:mermaid.errors.render')}</div><div class="render-error-detail">${this.#state.d}</div>` : ((this.#state && this.#state.n && !this.wip) ? t('chat:mermaid.errors.empty') : t('chat:mermaid.rendering')))}</div>`,
        latex: () => html`<div class="latex-renderer custom-renderer">${(this.#state && this.#state.h) ? html`<div .innerHTML=${this.#state.h}></div>` : ((this.#state && this.#state.e && !this.wip) ? html`<div class="render-error-banner">${t('chat:codeBlock.renderer.error.latex')}</div><div class="render-error-detail">${this.#state.d}</div>` : ((this.#state && this.#state.n && !this.wip) ? t('chat:codeBlock.renderer.empty') : t('chat:codeBlock.renderer.loading')))}</div>`,
    };

    private operationRenderers: Record<string, () => ReturnType<typeof html>> = {
        default: () => html`<sl-button size="small" ?disabled=${this.copied} @click=${this.copyContent}>
            ${this.copied ? t('chat:codeBlock.toolbar.copied') : t('chat:codeBlock.toolbar.copy')}
        </sl-button><sl-button size="small" @click=${this.downloadContent}>
            ${t('chat:codeBlock.toolbar.dl')}
        </sl-button>`,
        mermaid: () => html`<sl-button size="small" @click=${this.expandMermaid}>
            ${t('chat:mermaid.expand')}
        </sl-button><sl-dropdown>
            <sl-button size="small" slot="trigger" caret>${t('chat:mermaid.download.btn')}</sl-button>
            <sl-menu>
                <sl-menu-item @click=${() => this.downloadMermaid('svg')}><span slot="prefix" class="icon" .innerHTML=${download_icon}></span>${t('chat:mermaid.download.types.svg')}</sl-menu-item>
                <sl-menu-item @click=${() => this.downloadMermaid('png')}><span slot="prefix" class="icon" .innerHTML=${download_icon}></span>${t('chat:mermaid.download.types.png')}</sl-menu-item>
                <sl-menu-item @click=${() => this.downloadMermaid('src')}><span slot="prefix" class="icon" .innerHTML=${download_icon}></span>${t('chat:mermaid.download.types.plain')}</sl-menu-item>
            </sl-menu>
        </sl-dropdown>`,
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
            case 'latex':
                await this.renderLatex();
                break;
            default:
                this.#state = null;
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

    private downloadFile(content: BlobPart, ext = this.language, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = app_name_id + '-' + new Date().toISOString() + '.' + ext;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => (document.body.removeChild(a), URL.revokeObjectURL(a.href)), 2000);
    }

    private downloadContent() {
        const content = this.textContent;
        if (content) {
            this.downloadFile(content);
        }
        else {
            message.error('No content to download');
        }
    }
    
    // --------
    // Special renderers
    // --------
    
    // mermaid

    private async renderMermaid() {
        const code = this.textContent;
        if (!code) return (this.#state = { t: 'mermaid', e: false, n: true }, void 0);

        try {
            const id = new Uint32Array(4);
            crypto.getRandomValues(id);
            const result = await mermaid.render('s-' + id.join('-'), code);
            this.#state = {
                t: 'mermaid',
                e: false,
                h: getSafeHTML(result.svg, {}, false)
            };
        } catch (e) {
            // for renderer cache
            const h = (this.wip && this.#state && this.#state.t === 'mermaid' && this.#state.h) ? this.#state.h : undefined;
            this.#state = { t: 'mermaid', e: true, d: String(e), h };
        } finally {
            this.requestUpdate();
        }
    }

    private expandMermaid() {
        this.dispatchEvent(new CustomEvent('preview-svg', {
            bubbles: true,
            composed: true,
            detail: this.#state.h,
        }));
    }

    private async downloadMermaid(type: string) {
        try {
            switch (type) {
                case 'svg': {
                    const svgData = new XMLSerializer().serializeToString(getElement(this.#state.h)!);
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    this.downloadFile(blob, 'svg', 'image/svg+xml');
                    message.success(t('chat:mermaid.download.results.success'));
                }
                    break;
            
                case 'png':
                    (await this.svgToCanvas(this.#state.h)).toBlob((blob) => {
                        blob ? (this.downloadFile(blob, 'png', 'image/png'), message.success(t('chat:mermaid.download.results.success'))) : message.error(t('chat:mermaid.download.results.fail', { error: 'Unknown error' }));
                    }, 'image/png');
                    break;
        
                default:
                    this.downloadContent();
            }
        } catch (e) {
            message.error(t('chat:mermaid.download.results.fail', { error: String(e) }));
        }
    }
    
    private async svgToCanvas(svgStr: string): Promise<HTMLCanvasElement> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Unable to get canvas context');

        const svg = getElement(svgStr) as SVGSVGElement;
        if (!svg) throw 'Invalid svg';
        
        const p = document.createElement('div');
        p.style.visibility = 'hidden !important';
        p.append(svg);
        document.body.append(p);
        const rect = svg.getBoundingClientRect();
        const svgRect = svg.getBBox() || { x: 0, y: 0, width: rect.width, height: rect.height };
        p.remove();
        
        canvas.width = svgRect.width;
        canvas.height = svgRect.height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                resolve(canvas);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG image'));
            };
            img.src = url;
        });
    }

    // LaTeX

    private async renderLatex() {
        const code = this.textContent;
        if (!code) {
            this.#state = { t: 'latex', e: false, n: true };
            return;
        }

        try {
            const rendered = katex.renderToString(code, {
                displayMode: true,
                throwOnError: false,
                errorColor: '#cc0000',
            });
            this.#state = {
                t: 'latex',
                e: false,
                h: getSafeHTML(rendered, {}, false),
            };
        } catch (e) {
            this.#state = { t: 'latex', e: true, d: String(e) };
        } finally {
            this.requestUpdate();
        }
    }

}

window.customElements.define(OCW_CODE_BLOCK_TAG_NAME, OcwCodeBlock);
