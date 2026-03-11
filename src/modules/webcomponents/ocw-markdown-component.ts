import { LitElement, html, css } from 'lit';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { message } from 'ant-design-vue';

export class OcwMarkdownComponent extends LitElement {
    static styles = css`
    :host {
        display: block;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    :host([type="pre"]) {
        background-color: var(--code-bg, #f6f8fa);
        border-radius: 5px;
        padding: 0.5em;
        font-family: 'Consolas', 'Courier New', monospace;
        overflow: auto;
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
        white-space: pre;
    }

    `;

    static properties = {
        type: { type: String },
        copied: { type: Boolean, reflect: true },
        language: { type: String, reflect: true },
    };

    declare type: string;
    declare copied: boolean;
    declare language: string;

    constructor() {
        super();
        this.type = '';
        this.copied = false;
        this.language = '';
    }

    private renderers: Record<string, () => ReturnType<typeof html>> = {
        default: () => html`<slot></slot>`,
        pre: () => html`<div class="pre-renderer"><div class="header">
            <div class="language"><slot name="language"><span>${this.language}</span></slot></div>
            <div class="flexible-space"></div>
            <div class="operations">
                <sl-button size="small" ?disabled=${this.copied} @click=${this.copyContent}>${this.copied ? 'Copied' : 'Copy'}</sl-button>
                <sl-button size="small" @click=${this.downloadContent}>Download</sl-button>
            </div>
        </div><div class="content"><slot></slot></div></div>`,
    };

    render() {
        return (this.renderers[this.type] ?? this.renderers.default!)();
    }

    connectedCallback(): void {
        super.connectedCallback();
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

if (window.customElements.get('ocw-markdown-component') && process.env.NODE_ENV === 'development') window.location.reload();
else window.customElements.define('ocw-markdown-component', OcwMarkdownComponent);
