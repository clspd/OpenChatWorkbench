import Panzoom from '@panzoom/panzoom'

export function previewImage(url: string, dispose?: () => void) {
    const body = document.body
    const previousOverflow = body.style.overflow

    const overlay = document.createElement('div')
    const stage = document.createElement('div')
    const img = document.createElement('img')
    const closeBtn = document.createElement('button')

    let panzoom: ReturnType<typeof Panzoom> | null = null
    let closed = false

    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647; background: rgba(0, 0, 0, 0.88); overflow: hidden;';
    stage.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden; touch-action: none; user-select: none;';
    img.src = url,
    img.alt = '',
    img.draggable = false,
    img.style.cssText = 'position: absolute; left: 0; top: 0; display: block; max-width: none; max-height: none; will-change: transform; cursor: grab;';

    closeBtn.type = 'button',
    closeBtn.textContent = '×',
    closeBtn.setAttribute('aria-label', 'Close'),
    closeBtn.style.cssText = 'position: absolute; top: 16px; right: 16px; z-index: 2; width: 40px; height: 40px; border: 0; border-radius: 999px; background: rgba(255, 255, 255, 0.16); color: #fff; font-size: 28px; line-height: 40px; cursor: pointer;';

    stage.appendChild(img)
    stage.appendChild(closeBtn)
    overlay.appendChild(stage)
    body.appendChild(overlay)
    body.style.overflow = 'hidden'

    const cleanup = () => {
        if (closed) return
        closed = true

        window.removeEventListener('keydown', onKeyDown, true)
        overlay.removeEventListener('click', onOverlayClick)
        closeBtn.removeEventListener('click', onCloseClick)
        stage.removeEventListener('wheel', onWheel)

        panzoom?.destroy()
        panzoom?.resetStyle()
        panzoom = null

        overlay.remove()
        body.style.overflow = previousOverflow
        dispose?.()
    }

    const onCloseClick = (e: MouseEvent) => {
        e.stopPropagation()
        cleanup()
    }

    const onOverlayClick = (e: MouseEvent) => {
        if (e.target === overlay) cleanup()
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cleanup()
    }

    const onWheel = (e: WheelEvent) => {
        panzoom?.zoomWithWheel(e)
    }

    const initPanzoom = () => {
        if (closed || panzoom) return

        const vw = window.innerWidth
        const vh = window.innerHeight
        const nw = img.naturalWidth || 1
        const nh = img.naturalHeight || 1

        const fitScale = Math.min((vw - 32) / nw, (vh - 32) / nh, 1)

        panzoom = Panzoom(img, {
            startScale: fitScale,
            startX: 0,
            startY: 0,
            minScale: 0.3,
            maxScale: 8,
            panOnlyWhenZoomed: false,
            roundPixels: true,
            cursor: 'grab',
            touchAction: 'none',
        })

        stage.addEventListener('wheel', onWheel, { passive: false })
    }

    if (img.complete && img.naturalWidth > 0) {
        initPanzoom()
    } else {
        img.addEventListener('load', initPanzoom, { once: true })
        img.addEventListener('error', cleanup, { once: true })
    }

    overlay.addEventListener('click', onOverlayClick)
    closeBtn.addEventListener('click', onCloseClick)
    window.addEventListener('keydown', onKeyDown, true)

    return cleanup
}
