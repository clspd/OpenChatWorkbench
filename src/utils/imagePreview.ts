import Panzoom from '@panzoom/panzoom'

export interface PreviewController {
    zoomWithWheel: (e: WheelEvent) => void
    destroy: () => void
    resetStyle: () => void
}

function createPreview(
    content: HTMLElement,
    initPanzoom: (stage: HTMLElement) => PreviewController,
    dispose?: () => void
) {
    const body = document.body
    const previousOverflow = body.style.overflow

    const dialog = document.createElement('dialog')
    const stage = document.createElement('div')
    const closeBtn = document.createElement('button')

    let controller: PreviewController | null = null
    let closed = false;

    (dialog as any).closedBy = 'closeRequest'

    dialog.style.cssText = `
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        box-sizing: border-box;
        padding: 0;
        border: none;
        background: rgba(255, 255, 255, 0.8);
        overflow: hidden;
    `

    stage.style.cssText = `
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        touch-action: none;
        user-select: none;
    `

    content.style.cssText += `
        position: absolute;
        left: 0;
        top: 0;
        cursor: grab;
    `
    content.autofocus = true

    closeBtn.type = 'button'
    closeBtn.textContent = '×'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 2;
        width: 40px;
        height: 40px;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 28px;
        line-height: 40px;
        cursor: pointer;
    `

    stage.appendChild(content)
    stage.appendChild(closeBtn)
    dialog.appendChild(stage)
    body.appendChild(dialog)

    body.style.overflow = 'hidden'

    const onWheel = (e: WheelEvent) => {
        controller?.zoomWithWheel(e)
    }

    const cleanup = () => {
        if (closed) return
        closed = true

        stage.removeEventListener('wheel', onWheel)

        controller?.destroy()
        controller?.resetStyle()
        controller = null

        dialog.remove()
        body.style.overflow = previousOverflow
        dispose?.()
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dialog.close()
    })

    dialog.addEventListener('close', cleanup)

    dialog.style.visibility = 'hidden';
    requestAnimationFrame(() => (controller = initPanzoom(stage), requestAnimationFrame(() => dialog.style.visibility = 'visible')));
    stage.addEventListener('wheel', onWheel, { passive: false })

    dialog.showModal()

    return () => dialog.close()
}

export function previewImage(url: string, dispose?: () => void) {
    const img = document.createElement('img')

    img.src = url
    img.alt = ''
    img.draggable = false
    img.style.cssText = `
        display: block;
        max-width: none;
        max-height: none;
    `

    const init = (stage: HTMLElement): PreviewController => {
        const stageRect = stage.getBoundingClientRect()
        const w = img.naturalWidth || 1
        const h = img.naturalHeight || 1

        const fitScale = Math.min(
            (stageRect.width - 0) / w,
            (stageRect.height - 0) / h,
        );

        const x = (stageRect.width - w) / (2 * fitScale)
        const y = (stageRect.height - h) / (2 * fitScale)

        const panzoom = Panzoom(img, {
            startScale: fitScale,
            minScale: 0.1,
            maxScale: 8,
            roundPixels: true,
            cursor: 'grab',
            touchAction: 'none',
            startX: x,
            startY: y,
        })

        return {
            zoomWithWheel: (e: WheelEvent) => panzoom.zoomWithWheel(e),
            destroy: () => panzoom.destroy(),
            resetStyle: () => panzoom.resetStyle(),
        }
    }

    if (img.complete && img.naturalWidth > 0) {
        return createPreview(img, init, dispose)
    } else {
        img.addEventListener(
            'load',
            () => createPreview(img, init, dispose),
            { once: true }
        )
        img.addEventListener(
            'error',
            () => dispose?.(),
            { once: true }
        )
    }
}

export function previewSvg(svg: SVGSVGElement, dispose?: () => void) {
    const cloned = svg.cloneNode(true) as SVGSVGElement

    cloned.removeAttribute('width')
    cloned.removeAttribute('height')

    type ViewBox = { x: number; y: number; w: number; h: number }
    type Point = { x: number; y: number }

    function warn(msg: string, data?: any) {
        console.warn('[util::imagePreview]', msg, data ?? '')
    }

    function getInitialViewBox(el: SVGSVGElement): ViewBox {
        const vb = el.viewBox.baseVal

        if (vb && vb.width > 0 && vb.height > 0) {
            return { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
        }

        try {
            const bbox = el.getBBox()
            if (bbox.width > 0 && bbox.height > 0) {
                return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height }
            }
        } catch (e) {
            warn('getBBox failed', e)
        }

        warn('fallback viewBox used')
        return { x: 0, y: 0, w: 100, h: 100 }
    }

    let viewBox = getInitialViewBox(cloned)

    function updateViewBox() {
        if (
            !isFinite(viewBox.x) ||
            !isFinite(viewBox.y) ||
            !isFinite(viewBox.w) ||
            !isFinite(viewBox.h)
        ) {
            warn('Invalid viewBox prevented', { ...viewBox })
            return
        }

        cloned.setAttribute(
            'viewBox',
            `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
        )
    }

    updateViewBox()

    cloned.style.cssText = `
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
        touch-action: none;
        user-select: none;
    `

    const pointers = new Map<number, Point>()
    const lastPointers = new Map<number, Point>()

    let gestureStart: {
        viewBox: ViewBox
        distance: number
        midpoint: Point
    } | null = null

    let rafId: number | null = null

    function dist(a: Point, b: Point) {
        return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function mid(a: Point, b: Point) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    function getRectSafe() {
        const rect = cloned.getBoundingClientRect()

        if (!rect.width || !rect.height) {
            warn('getBoundingClientRect returned zero size', rect)
        }

        return {
            left: rect.left,
            top: rect.top,
            width: rect.width || 1,
            height: rect.height || 1,
        }
    }

    function schedulePinchUpdate() {
        if (rafId !== null) return

        rafId = requestAnimationFrame(() => {
            rafId = null

            if (pointers.size !== 2 || !gestureStart) return

            const [p1, p2] = [...pointers.values()]
            if (!(p1 && p2)) return

            const rect = getRectSafe()

            const currentMid = mid(p1, p2)
            const currentDistance = dist(p1, p2)

            if (!isFinite(currentDistance) || currentDistance <= 0) {
                warn('Invalid distance', currentDistance)
                return
            }

            const scale = gestureStart.distance / currentDistance
            if (!isFinite(scale)) {
                warn('Invalid scale', scale)
                return
            }

            const newW = gestureStart.viewBox.w * scale
            const newH = gestureStart.viewBox.h * scale

            const startCx =
                (gestureStart.midpoint.x - rect.left) / rect.width
            const startCy =
                (gestureStart.midpoint.y - rect.top) / rect.height
            const currentCx = (currentMid.x - rect.left) / rect.width
            const currentCy = (currentMid.y - rect.top) / rect.height

            const anchorX =
                gestureStart.viewBox.x + gestureStart.viewBox.w * startCx
            const anchorY =
                gestureStart.viewBox.y + gestureStart.viewBox.h * startCy

            viewBox.w = newW
            viewBox.h = newH
            viewBox.x = anchorX - newW * currentCx
            viewBox.y = anchorY - newH * currentCy

            updateViewBox()
        })
    }

    function onPointerDown(e: PointerEvent) {
        if (!cloned.isConnected) return

        e.preventDefault()

        try {
            cloned.setPointerCapture(e.pointerId)
        } catch (err) {
            warn('setPointerCapture failed', err)
        }

        const point = { x: e.clientX, y: e.clientY }
        pointers.set(e.pointerId, point)
        lastPointers.set(e.pointerId, point)

        if (pointers.size === 2) {
            const [p1, p2] = [...pointers.values()]
            if (!(p1 && p2)) return

            gestureStart = {
                viewBox: { ...viewBox },
                distance: dist(p1, p2),
                midpoint: mid(p1, p2),
            }
        }
    }

    function onPointerMove(e: PointerEvent) {
        if (!pointers.has(e.pointerId)) return

        e.preventDefault()

        const current = { x: e.clientX, y: e.clientY }
        const previous = lastPointers.get(e.pointerId) ?? current

        pointers.set(e.pointerId, current)
        lastPointers.set(e.pointerId, current)

        const rect = getRectSafe()

        if (pointers.size === 1) {
            const dx = current.x - previous.x
            const dy = current.y - previous.y

            const factor = Math.max(
                viewBox.w / rect.width,
                viewBox.h / rect.height
            )

            if (!isFinite(factor)) {
                warn('Invalid pan factor', factor)
                return
            }

            viewBox.x -= dx * factor
            viewBox.y -= dy * factor

            updateViewBox()
            return
        }

        if (pointers.size === 2 && gestureStart) {
            schedulePinchUpdate()
        }
    }

    function endPointer(e: PointerEvent) {
        pointers.delete(e.pointerId)
        lastPointers.delete(e.pointerId)

        if (pointers.size < 2) {
            gestureStart = null
        }

        if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault()

        const zoomFactor = Math.exp(e.deltaY * 0.0015)

        if (!isFinite(zoomFactor)) {
            warn('Invalid zoomFactor', zoomFactor)
            return
        }

        const rect = getRectSafe()

        const cx = (e.clientX - rect.left) / rect.width
        const cy = (e.clientY - rect.top) / rect.height

        const newW = viewBox.w * zoomFactor
        const newH = viewBox.h * zoomFactor

        viewBox.x += (viewBox.w - newW) * cx
        viewBox.y += (viewBox.h - newH) * cy
        viewBox.w = newW
        viewBox.h = newH

        updateViewBox()
    }

    const init = (): PreviewController => {
        cloned.addEventListener('pointerdown', onPointerDown)
        cloned.addEventListener('pointermove', onPointerMove)
        cloned.addEventListener('pointerup', endPointer)
        cloned.addEventListener('pointercancel', endPointer)
        cloned.addEventListener('lostpointercapture', endPointer)
        cloned.addEventListener('wheel', onWheel, { passive: false })

        return {
            zoomWithWheel: onWheel,
            destroy() {
                cloned.removeEventListener('pointerdown', onPointerDown)
                cloned.removeEventListener('pointermove', onPointerMove)
                cloned.removeEventListener('pointerup', endPointer)
                cloned.removeEventListener('pointercancel', endPointer)
                cloned.removeEventListener('lostpointercapture', endPointer)
                cloned.removeEventListener('wheel', onWheel)
            },
            resetStyle() {},
        }
    }

    return createPreview(cloned as unknown as HTMLElement, init, dispose)
}


