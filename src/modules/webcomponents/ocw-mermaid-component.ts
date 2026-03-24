import { LitElement, html, css } from 'lit';
import { message } from 'ant-design-vue';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import i18next from 'i18next';
import type { PanZoom } from 'panzoom';
import panzoom from 'panzoom';
import type * as MermaidType from 'mermaid';

declare global {
    interface Window {
        mermaid: any;
    }
}

export class OcwMermaidComponent extends LitElement {
    static styles = css`
:host {
    display: block;
    white-space: normal;
    overflow-wrap: break-word;
}

:host([mode="inline"]) .mermaid-toolbar {
    display: none;
}

:host([mode="inline"]) .mermaid-inline-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0.5em;
    background-color: var(--mermaid-toolbar-bg, #fafbfc);
    border-top: 1px solid var(--mermaid-border, #e5e5e5);
    gap: 0.5em;
}

:host([mode="inline"]) .mermaid-svg-container {
    cursor: default;
}

:host([mode="modal"]) .mermaid-inline-toolbar {
    display: none;
}

:host {
    --mermaid-bg: #ffffff;
    --mermaid-border: #e5e5e5;
    --mermaid-label: #666;
    --mermaid-content-bg: #fafbfc;
}

:host svg {
    max-width: 100%;
    height: auto;
}

.mermaid-wrapper {
    background-color: var(--mermaid-bg, #ffffff);
    border: 1px solid var(--mermaid-border, #e5e5e5);
    border-radius: 5px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.mermaid-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em;
    border-bottom: 1px solid var(--mermaid-border, #e5e5e5);
    background-color: var(--mermaid-toolbar-bg, #fafbfc);
    flex-wrap: wrap;
    user-select: none;
}

.mermaid-toolbar-group {
    display: flex;
    align-items: center;
    gap: 0.25em;
}

.mermaid-toolbar-separator {
    width: 1px;
    height: 24px;
    background-color: var(--mermaid-border, #e5e5e5);
    margin: 0 0.25em;
}

.mermaid-toolbar-label {
    font-size: 0.85em;
    color: var(--mermaid-label, #666);
    min-width: 50px;
    text-align: center;
    font-weight: 500;
}

.mermaid-content {
    flex: 1;
    overflow: hidden;
    background-color: var(--mermaid-content-bg, #fafbfc);
    position: relative;
}

.mermaid-svg-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
}

.mermaid-svg-container.dragging {
    cursor: grabbing;
}

.mermaid-svg-container svg {
    display: block;
    max-width: none;
    max-height: none;
}

.mermaid-loading {
    color: var(--mermaid-label, #666);
    font-style: italic;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.mermaid-error {
    color: #d32f2f;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 1em;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

sl-button::part(base) {
    height: 28px;
    padding: 0 8px;
}

sl-dropdown::part(trigger) {
    padding: 0;
}

sl-menu-item {
    font-size: 0.9em;
}
    `;

    static properties = {
        type: { type: String },
        mode: { type: String },
        content: { type: String },
        error: { type: String },
        loading: { type: Boolean },
        zoom: { type: Number, state: true },
    };

    declare type: string;
    declare mode: 'inline' | 'modal';
    declare content: string;
    declare error: string;
    declare loading: boolean;
    declare zoom: number;

    private panzoom: PanZoom | null = null;
    private svgContainer: HTMLDivElement | null = null;
    private mermaidSvg: SVGSVGElement | null = null;

    constructor() {
        super();
        this.type = '';
        this.mode = 'inline';
        this.content = '';
        this.error = '';
        this.loading = true;
        this.zoom = 100;
    }

    async firstUpdated() {
        try {
            if (!this.content) {
                this.error = i18next.t('chat:mermaid.noContent');
                this.loading = false;
                this.requestUpdate();
                return;
            }
            const mermaidModule = await import('mermaid');
            const mermaid = mermaidModule.default;
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
            });
            await this.renderMermaid(mermaid);
            if (this.mode === 'modal') {
                await this.updateComplete;
                this.initPanzoom();
            }
        } catch (e) {
            // console.error('[OcwMermaidComponent] Failed to load mermaid:', e);
            this.error = i18next.t('chat:mermaid.loadFailed');
            this.loading = false;
            this.requestUpdate();
        }
    }

    private async renderMermaid(mermaid: typeof MermaidType.default) {
        try {
            const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
            const result = await mermaid.render(id, this.content);
            
            this.error = '';
            this.loading = false;
            
            await this.updateComplete;
            const svgContainer = this.shadowRoot?.querySelector('.mermaid-svg-container');
            if (svgContainer) {
                svgContainer.innerHTML = result.svg;
                this.mermaidSvg = svgContainer.querySelector('svg');
                if (this.mermaidSvg) {
                    this.mermaidSvg.style.width = '100%';
                    this.mermaidSvg.style.height = '100%';
                    if (this.mode === 'inline') {
                        svgContainer.addEventListener('dblclick', () => {
                            this.dispatchEvent(new CustomEvent('maximize', { bubbles: true, composed: true }));
                        });
                    }
                }
            }
        } catch (e: any) {
            console.error('[OcwMermaidComponent] Mermaid render error:', e);
            this.error = String(e);
            this.loading = false;
            this.requestUpdate();
            message.error(i18next.t('chat:mermaid.renderFailed'));
        }
    }

    private initPanzoom() {
        const element = this.shadowRoot?.querySelector('.mermaid-svg-container');
        if (!element) return;

        this.svgContainer = element as HTMLDivElement;
        const svg = element.querySelector('svg');
        if (!svg) return;
        this.panzoom = panzoom(svg, {
            minZoom: 0.5,
            maxZoom: 5,
            initialZoom: 1,
            zoomDoubleClickSpeed: 1.5,
        });
        this.panzoom.on('zoom', (e: any) => {
            const scale = e.getTransform().scale;
            this.zoom = Math.round(scale * 100);
        });
        element.addEventListener('wheel', ((e: WheelEvent) => {
            if (!this.panzoom) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = (element as HTMLDivElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.panzoom.zoomTo(x, y, delta);
        }) as EventListener, { passive: false });
        this.setupTouchSupport(element as HTMLDivElement);
    }

    private setupTouchSupport(element: HTMLDivElement) {
        let lastDistance = 0;

        element.addEventListener('touchmove', ((e: TouchEvent) => {
            if (e.touches.length === 2 && this.panzoom) {
                e.preventDefault();
                
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                if (!touch1 || !touch2) return;
                
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                
                if (lastDistance > 0) {
                    const scale = distance / lastDistance;
                    const rect = element.getBoundingClientRect();
                    const x = centerX - rect.left;
                    const y = centerY - rect.top;
                    this.panzoom.zoomTo(x, y, scale);
                }
                
                lastDistance = distance;
            }
        }) as EventListener, { passive: false });

        element.addEventListener('touchend', () => {
            lastDistance = 0;
        });
    }

    private zoomIn() {
        if (!this.panzoom || !this.svgContainer) return;
        const rect = this.svgContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.panzoom.zoomTo(centerX, centerY, 1.2);
    }

    private zoomOut() {
        if (!this.panzoom || !this.svgContainer) return;
        const rect = this.svgContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.panzoom.zoomTo(centerX, centerY, 0.8);
    }

    private resetZoom() {
        if (!this.panzoom) return;
        (this.panzoom as any).setTransform(0, 0, 1);
        this.zoom = 100;
    }

    private async downloadSVG() {
        if (!this.mermaidSvg) return;
        try {
            const svgData = new XMLSerializer().serializeToString(this.mermaidSvg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            this.downloadBlob(blob, 'diagram.svg');
            message.success(i18next.t('chat:mermaid.downloadSuccess'));
        } catch (e) {
            console.error('Failed to download SVG:', e);
            message.error(i18next.t('chat:mermaid.downloadFailed'));
        }
    }

    private async downloadPNG() {
        if (!this.mermaidSvg) return;
        try {
            const canvas = await this.svgToCanvas(this.mermaidSvg);
            canvas.toBlob((blob) => {
                if (blob) {
                    this.downloadBlob(blob, 'diagram.png');
                    message.success(i18next.t('chat:mermaid.downloadSuccess'));
                }
            }, 'image/png');
        } catch (e) {
            console.error('Failed to download PNG:', e);
            message.error(i18next.t('chat:mermaid.downloadFailed'));
        }
    }

    private downloadSource() {
        try {
            const blob = new Blob([this.content], { type: 'text/plain' });
            this.downloadBlob(blob, 'diagram.mmd');
            message.success(i18next.t('chat:mermaid.downloadSuccess'));
        } catch (e) {
            console.error('Failed to download source:', e);
            message.error(i18next.t('chat:mermaid.downloadFailed'));
        }
    }

    private downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    private async svgToCanvas(svg: SVGSVGElement): Promise<HTMLCanvasElement> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Unable to get canvas context');

        const rect = svg.getBoundingClientRect();
        const svgRect = svg.getBBox?.() || { x: 0, y: 0, width: rect.width, height: rect.height };
        
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

    render() {
        if (this.loading) {
            return html`<div class="mermaid-loading">${i18next.t('chat:mermaid.rendering')}</div>`;
        }

        if (this.error) {
            return html`<div class="mermaid-error">${this.error}</div>`;
        }
        if (this.mode === 'inline') {
            return html`
                <div class="mermaid-wrapper">
                    <div class="mermaid-content">
                        <div class="mermaid-svg-container"></div>
                    </div>
                    <div class="mermaid-inline-toolbar">
                        <sl-button size="small" @click=${() => this.dispatchEvent(new CustomEvent('maximize', { bubbles: true, composed: true }))}>
                            ▢ ${i18next.t('chat:mermaid.expand')}
                        </sl-button>
                    </div>
                </div>
            `;
        }
        return html`
            <div class="mermaid-wrapper">
                <div class="mermaid-toolbar">
                    <div class="mermaid-toolbar-group">
                        <sl-button size="small" @click=${this.zoomOut} title="Zoom out">
                            −
                        </sl-button>
                        <div class="mermaid-toolbar-label">${this.zoom}%</div>
                        <sl-button size="small" @click=${this.zoomIn} title="Zoom in">
                            +
                        </sl-button>
                    </div>
                    <div class="mermaid-toolbar-separator"></div>
                    <div class="mermaid-toolbar-group">
                        <sl-button size="small" @click=${this.resetZoom} title="Reset zoom">
                            ↻
                        </sl-button>
                    </div>
                    <div class="mermaid-toolbar-separator"></div>
                    <div class="mermaid-toolbar-group">
                        <sl-dropdown>
                            <sl-button size="small" slot="trigger" caret>
                                ⬇ ${i18next.t('chat:mermaid.download')}
                            </sl-button>
                            <sl-menu>
                                <sl-menu-item @click=${this.downloadSVG}>📄 ${i18next.t('chat:mermaid.downloadSVG')}</sl-menu-item>
                                <sl-menu-item @click=${this.downloadPNG}>🖼 ${i18next.t('chat:mermaid.downloadPNG')}</sl-menu-item>
                                <sl-menu-item @click=${this.downloadSource}>💾 ${i18next.t('chat:mermaid.downloadSource')}</sl-menu-item>
                            </sl-menu>
                        </sl-dropdown>
                    </div>
                </div>
                <div class="mermaid-content">
                    <div class="mermaid-svg-container"></div>
                </div>
            </div>
        `;
    }
}

if (window.customElements.get('ocw-mermaid-component') && process.env.NODE_ENV === 'development') window.location.reload();
else window.customElements.define('ocw-mermaid-component', OcwMermaidComponent);
