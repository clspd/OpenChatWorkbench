type Point = { x: number; y: number }
type TransformState = { scale: number; x: number; y: number }
type ViewBox = { x: number; y: number; w: number; h: number }

export interface PreviewController {
    zoomWithWheel: (e: WheelEvent) => void
    destroy: () => void
    resetStyle: () => void
}

interface PreviewAdapter extends PreviewController {
    fitToStage: (stage: HTMLElement) => void
    panBy: (dx: number, dy: number) => void
    zoomAt: (clientX: number, clientY: number, factor: number) => void
    beginPinch: (points: [Point, Point]) => void
    updatePinch: (points: [Point, Point]) => void
}

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n))
}

function isFiniteNumber(n: number) {
    return Number.isFinite(n)
}

function dist(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y)
}

function mid(a: Point, b: Point) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function safeRect(el: Element) {
    const rect = el.getBoundingClientRect()
    return {
        left: rect.left,
        top: rect.top,
        width: rect.width || 1,
        height: rect.height || 1,
    }
}

function createPreview(
    content: HTMLElement,
    initAdapter: (stage: HTMLElement) => PreviewAdapter,
    dispose?: () => void
) {
    const body = document.body
    const previousOverflow = body.style.overflow

    const dialog = document.createElement('dialog')
    const stage = document.createElement('div')
    const closeBtn = document.createElement('button')

    let adapter: PreviewAdapter | null = null
    let gestureBinder: { destroy: () => void } | null = null
    let closed = false

    ;(dialog as any).closedBy = 'closeRequest'

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
    ;(content as any).autofocus = true

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
        adapter?.zoomWithWheel(e)
    }

    const cleanup = () => {
        if (closed) return
        closed = true

        stage.removeEventListener('wheel', onWheel)

        gestureBinder?.destroy()
        gestureBinder = null

        adapter?.destroy()
        adapter?.resetStyle()
        adapter = null

        dialog.remove()
        body.style.overflow = previousOverflow
        dispose?.()
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dialog.close()
    })

    dialog.addEventListener('close', cleanup)

    dialog.style.visibility = 'hidden'
    dialog.showModal()

    requestAnimationFrame(() => {
        adapter = initAdapter(stage)

        gestureBinder = bindGestures(content, adapter)

        adapter.fitToStage(stage)

        requestAnimationFrame(() => {
            adapter?.fitToStage(stage)
            dialog.style.visibility = 'visible'
        })
    })

    stage.addEventListener('wheel', onWheel, { passive: false })

    return () => dialog.close()
}

function createTransformAdapter(
    content: HTMLElement,
    stage: HTMLElement,
    baseWidth: number,
    baseHeight: number,
    options?: {
        minScale?: number
        maxScale?: number
        fitPadding?: number
        fitMaxScale?: number
    }
): PreviewAdapter {
    const minScale = options?.minScale ?? 0.1
    const maxScale = options?.maxScale ?? 8
    const fitPadding = options?.fitPadding ?? 32
    const fitMaxScale = options?.fitMaxScale ?? 1

    const prev = {
        transform: content.style.transform,
        transformOrigin: content.style.transformOrigin,
        width: content.style.width,
        height: content.style.height,
        cursor: content.style.cursor,
        touchAction: content.style.touchAction,
        userSelect: content.style.userSelect,
        display: content.style.display,
        maxWidth: content.style.maxWidth,
        maxHeight: content.style.maxHeight,
        position: content.style.position,
        left: content.style.left,
        top: content.style.top,
    }

    content.style.transformOrigin = '0 0'
    content.style.touchAction = 'none'
    content.style.userSelect = 'none'
    content.style.cursor = 'grab'
    content.style.display = 'block'
    content.style.maxWidth = 'none'
    content.style.maxHeight = 'none'
    content.style.position = 'absolute'
    content.style.left = '0'
    content.style.top = '0'
    content.style.width = `${baseWidth}px`
    content.style.height = `${baseHeight}px`

    const state: TransformState = {
        scale: 1,
        x: 0,
        y: 0,
    }

    let pinchStart:
        | {
            state: TransformState
            distance: number
            anchor: Point
        }
        | null = null

    function apply() {
        content.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`
    }

    function fitToStage() {
        const rect = safeRect(stage)
        const availW = Math.max(rect.width - fitPadding, 1)
        const availH = Math.max(rect.height - fitPadding, 1)

        const raw = Math.min(availW / baseWidth, availH / baseHeight, fitMaxScale)
        const fitScale = clamp(isFiniteNumber(raw) && raw > 0 ? raw : 1, minScale, maxScale)

        state.scale = fitScale
        state.x = (rect.width - baseWidth * fitScale) / 2
        state.y = (rect.height - baseHeight * fitScale) / 2
        apply()
    }

    function panBy(dx: number, dy: number) {
        if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return
        state.x += dx
        state.y += dy
        apply()
    }

    function zoomAt(clientX: number, clientY: number, factor: number) {
        if (!isFiniteNumber(factor) || factor <= 0) return

        const nextScale = clamp(state.scale * factor, minScale, maxScale)
        if (nextScale === state.scale) return

        const contentX = (clientX - state.x) / state.scale
        const contentY = (clientY - state.y) / state.scale

        state.scale = nextScale
        state.x = clientX - contentX * nextScale
        state.y = clientY - contentY * nextScale
        apply()
    }

    function beginPinch(points: [Point, Point]) {
        const [p1, p2] = points
        const midpoint = mid(p1, p2)

        pinchStart = {
            state: { ...state },
            distance: dist(p1, p2),
            anchor: {
                x: (midpoint.x - state.x) / state.scale,
                y: (midpoint.y - state.y) / state.scale,
            },
        }
    }

    function updatePinch(points: [Point, Point]) {
        if (!pinchStart) return

        const [p1, p2] = points
        const currentDistance = dist(p1, p2)
        if (!isFiniteNumber(currentDistance) || currentDistance <= 0) return

        const currentMid = mid(p1, p2)
        const factor = currentDistance / pinchStart.distance
        const nextScale = clamp(pinchStart.state.scale * factor, minScale, maxScale)

        state.scale = nextScale
        state.x = currentMid.x - pinchStart.anchor.x * nextScale
        state.y = currentMid.y - pinchStart.anchor.y * nextScale
        apply()
    }

    function zoomWithWheel(e: WheelEvent) {
        e.preventDefault()
        zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015))
    }

    function destroy() {
        pinchStart = null
    }

    function resetStyle() {
        content.style.transform = prev.transform
        content.style.transformOrigin = prev.transformOrigin
        content.style.width = prev.width
        content.style.height = prev.height
        content.style.cursor = prev.cursor
        content.style.touchAction = prev.touchAction
        content.style.userSelect = prev.userSelect
        content.style.display = prev.display
        content.style.maxWidth = prev.maxWidth
        content.style.maxHeight = prev.maxHeight
        content.style.position = prev.position
        content.style.left = prev.left
        content.style.top = prev.top
    }

    return {
        fitToStage,
        panBy,
        zoomAt,
        beginPinch,
        updatePinch,
        zoomWithWheel,
        destroy,
        resetStyle,
    }
}

function parseLength(value: string | null): number | null {
    if (!value) return null
    const n = Number.parseFloat(value)
    return Number.isFinite(n) && n > 0 ? n : null
}

function measureSvgBaseViewBox(svg: SVGSVGElement): ViewBox {
    const vb = svg.viewBox.baseVal
    if (vb && vb.width > 0 && vb.height > 0) {
        return { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
    }

    const attrW = parseLength(svg.getAttribute('width'))
    const attrH = parseLength(svg.getAttribute('height'))
    if (attrW && attrH) {
        return { x: 0, y: 0, w: attrW, h: attrH }
    }

    try {
        const bbox = svg.getBBox()
        if (bbox.width > 0 && bbox.height > 0) {
            return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height }
        }
    } catch {
        // ignore
    }

    return { x: 0, y: 0, w: 100, h: 100 }
}

function createSvgViewBoxAdapter(
    svg: SVGSVGElement
): PreviewAdapter {
    const prev = {
        transform: svg.style.transform,
        transformOrigin: svg.style.transformOrigin,
        width: svg.style.width,
        height: svg.style.height,
        cursor: svg.style.cursor,
        touchAction: svg.style.touchAction,
        userSelect: svg.style.userSelect,
        display: svg.style.display,
        maxWidth: svg.style.maxWidth,
        maxHeight: svg.style.maxHeight,
        position: svg.style.position,
        left: svg.style.left,
        top: svg.style.top,
        overflow: svg.style.overflow,
        preserveAspectRatio: svg.getAttribute('preserveAspectRatio'),
        viewBox: svg.getAttribute('viewBox'),
        widthAttr: svg.getAttribute('width'),
        heightAttr: svg.getAttribute('height'),
    }

    const baseViewBox = measureSvgBaseViewBox(svg)
    let viewBox: ViewBox = { ...baseViewBox }

    let pinchStart:
        | {
              viewBox: ViewBox
              distance: number
              midpoint: Point
          }
        | null = null

    function applyViewBox() {
        svg.setAttribute(
            'viewBox',
            `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
        )
    }

    function fitToStage() {
        svg.style.width = '100%'
        svg.style.height = '100%'
        svg.style.display = 'block'
        svg.style.maxWidth = 'none'
        svg.style.maxHeight = 'none'
        svg.style.overflow = 'visible'
        svg.style.position = 'absolute'
        svg.style.left = '0'
        svg.style.top = '0'

        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        viewBox = { ...baseViewBox }
        applyViewBox()
    }

    function getRectSafe() {
        const rect = svg.getBoundingClientRect()
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width || 1,
            height: rect.height || 1,
        }
    }

    function panBy(dx: number, dy: number) {
        if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return

        const rect = getRectSafe()
        const factor = Math.max(viewBox.w / rect.width, viewBox.h / rect.height)

        viewBox.x -= dx * factor
        viewBox.y -= dy * factor
        applyViewBox()
    }

    function zoomAt(clientX: number, clientY: number, factor: number) {
        if (!isFiniteNumber(factor) || factor <= 0) return

        const rect = getRectSafe()
        const cx = (clientX - rect.left) / rect.width
        const cy = (clientY - rect.top) / rect.height

        const newW = viewBox.w * factor
        const newH = viewBox.h * factor

        viewBox.x += (viewBox.w - newW) * cx
        viewBox.y += (viewBox.h - newH) * cy
        viewBox.w = newW
        viewBox.h = newH
        applyViewBox()
    }

    function beginPinch(points: [Point, Point]) {
        const [p1, p2] = points
        const midpoint = mid(p1, p2)

        pinchStart = {
            viewBox: { ...viewBox },
            distance: dist(p1, p2),
            midpoint,
        }
    }

    function updatePinch(points: [Point, Point]) {
        if (!pinchStart) return

        const [p1, p2] = points
        const currentDistance = dist(p1, p2)
        if (!isFiniteNumber(currentDistance) || currentDistance <= 0) return

        const currentMid = mid(p1, p2)
        const scale = pinchStart.distance / currentDistance

        const newW = pinchStart.viewBox.w * scale
        const newH = pinchStart.viewBox.h * scale

        const rect = getRectSafe()
        const startCx = (pinchStart.midpoint.x - rect.left) / rect.width
        const startCy = (pinchStart.midpoint.y - rect.top) / rect.height
        const currentCx = (currentMid.x - rect.left) / rect.width
        const currentCy = (currentMid.y - rect.top) / rect.height

        const anchorX = pinchStart.viewBox.x + pinchStart.viewBox.w * startCx
        const anchorY = pinchStart.viewBox.y + pinchStart.viewBox.h * startCy

        viewBox.w = newW
        viewBox.h = newH
        viewBox.x = anchorX - newW * currentCx
        viewBox.y = anchorY - newH * currentCy
        applyViewBox()
    }

    function zoomWithWheel(e: WheelEvent) {
        e.preventDefault()
        zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015))
    }

    function destroy() {
        pinchStart = null
    }

    function resetStyle() {
        if (prev.transform !== undefined) svg.style.transform = prev.transform
        if (prev.transformOrigin !== undefined) svg.style.transformOrigin = prev.transformOrigin
        if (prev.width !== undefined) svg.style.width = prev.width
        if (prev.height !== undefined) svg.style.height = prev.height
        if (prev.cursor !== undefined) svg.style.cursor = prev.cursor
        if (prev.touchAction !== undefined) svg.style.touchAction = prev.touchAction
        if (prev.userSelect !== undefined) svg.style.userSelect = prev.userSelect
        if (prev.display !== undefined) svg.style.display = prev.display
        if (prev.maxWidth !== undefined) svg.style.maxWidth = prev.maxWidth
        if (prev.maxHeight !== undefined) svg.style.maxHeight = prev.maxHeight
        if (prev.position !== undefined) svg.style.position = prev.position
        if (prev.left !== undefined) svg.style.left = prev.left
        if (prev.top !== undefined) svg.style.top = prev.top
        if (prev.overflow !== undefined) svg.style.overflow = prev.overflow

        if (prev.preserveAspectRatio === null) {
            svg.removeAttribute('preserveAspectRatio')
        } else {
            svg.setAttribute('preserveAspectRatio', prev.preserveAspectRatio)
        }

        if (prev.viewBox === null) {
            svg.removeAttribute('viewBox')
        } else {
            svg.setAttribute('viewBox', prev.viewBox)
        }

        if (prev.widthAttr === null) svg.removeAttribute('width')
        else svg.setAttribute('width', prev.widthAttr)

        if (prev.heightAttr === null) svg.removeAttribute('height')
        else svg.setAttribute('height', prev.heightAttr)
    }

    return {
        fitToStage,
        panBy,
        zoomAt,
        beginPinch,
        updatePinch,
        zoomWithWheel,
        destroy,
        resetStyle,
    }
}

function bindGestures(
    content: HTMLElement,
    adapter: PreviewAdapter
) {
    const pointers = new Map<number, Point>()
    const lastPointers = new Map<number, Point>()

    let pinchActive = false
    let pinchRafId: number | null = null

    function getPrimaryTwoPoints(): [Point, Point] | null {
        const pair = [...pointers.entries()]
            .sort((a, b) => a[0] - b[0])
            .slice(0, 2)
            .map(([, p]) => p)

        if (pair.length !== 2) return null
        return [pair[0]!, pair[1]!]
    }

    function ensurePinchStarted() {
        const pair = getPrimaryTwoPoints()
        if (!pair) return
        adapter.beginPinch(pair)
        pinchActive = true
    }

    function schedulePinchUpdate() {
        if (pinchRafId !== null) return

        pinchRafId = requestAnimationFrame(() => {
            pinchRafId = null

            if (pointers.size < 2) return

            const pair = getPrimaryTwoPoints()
            if (!pair) return

            if (!pinchActive) {
                adapter.beginPinch(pair)
                pinchActive = true
            }

            adapter.updatePinch(pair)
        })
    }

    function stopPinchIfNeeded() {
        if (pointers.size < 2) {
            pinchActive = false
        }
    }

    function onPointerDown(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (!content.isConnected) return

        e.preventDefault()

        try {
            content.setPointerCapture(e.pointerId)
        } catch {
            // ignore
        }

        const point = { x: e.clientX, y: e.clientY }
        pointers.set(e.pointerId, point)
        lastPointers.set(e.pointerId, point)

        if (pointers.size >= 2) {
            ensurePinchStarted()
        }
    }

    function onPointerMove(e: PointerEvent) {
        if (e.pointerType === 'touch') return
        if (!pointers.has(e.pointerId)) return
        if (!content.isConnected) return

        e.preventDefault()

        const current = { x: e.clientX, y: e.clientY }
        const previous = lastPointers.get(e.pointerId) ?? current

        pointers.set(e.pointerId, current)
        lastPointers.set(e.pointerId, current)

        if (pointers.size === 1) {
            adapter.panBy(current.x - previous.x, current.y - previous.y)
            return
        }

        if (pointers.size >= 2) {
            if (!pinchActive) ensurePinchStarted()
            schedulePinchUpdate()
        }
    }

    function onPointerUp(e: PointerEvent) {
        if (e.pointerType === 'touch') return

        pointers.delete(e.pointerId)
        lastPointers.delete(e.pointerId)

        if (pointers.size >= 2) {
            ensurePinchStarted()
            schedulePinchUpdate()
        } else {
            stopPinchIfNeeded()
        }

        if (pinchRafId !== null) {
            cancelAnimationFrame(pinchRafId)
            pinchRafId = null
        }
    }

    function onTouchStart(e: TouchEvent) {
        if (!content.isConnected) return

        e.preventDefault()

        for (const touch of Array.from(e.changedTouches)) {
            const point = { x: touch.clientX, y: touch.clientY }
            pointers.set(touch.identifier, point)
            lastPointers.set(touch.identifier, point)
        }

        if (pointers.size >= 2) {
            ensurePinchStarted()
        }
    }

    function onTouchMove(e: TouchEvent) {
        if (!content.isConnected) return

        e.preventDefault()

        for (const touch of Array.from(e.changedTouches)) {
            const current = { x: touch.clientX, y: touch.clientY }
            const previous = lastPointers.get(touch.identifier) ?? current

            pointers.set(touch.identifier, current)
            lastPointers.set(touch.identifier, current)

            if (pointers.size === 1) {
                adapter.panBy(current.x - previous.x, current.y - previous.y)
            }
        }

        if (pointers.size >= 2) {
            if (!pinchActive) ensurePinchStarted()
            schedulePinchUpdate()
        }
    }

    function onTouchEnd(e: TouchEvent) {
        for (const touch of Array.from(e.changedTouches)) {
            pointers.delete(touch.identifier)
            lastPointers.delete(touch.identifier)
        }

        if (pointers.size >= 2) {
            ensurePinchStarted()
            schedulePinchUpdate()
        } else {
            stopPinchIfNeeded()
        }

        if (pinchRafId !== null) {
            cancelAnimationFrame(pinchRafId)
            pinchRafId = null
        }
    }

    content.addEventListener('pointerdown', onPointerDown)
    content.addEventListener('pointermove', onPointerMove)
    content.addEventListener('pointerup', onPointerUp)
    content.addEventListener('pointercancel', onPointerUp)
    content.addEventListener('lostpointercapture', onPointerUp)

    content.addEventListener('touchstart', onTouchStart, { passive: false })
    content.addEventListener('touchmove', onTouchMove, { passive: false })
    content.addEventListener('touchend', onTouchEnd)
    content.addEventListener('touchcancel', onTouchEnd)

    return {
        destroy() {
            content.removeEventListener('pointerdown', onPointerDown)
            content.removeEventListener('pointermove', onPointerMove)
            content.removeEventListener('pointerup', onPointerUp)
            content.removeEventListener('pointercancel', onPointerUp)
            content.removeEventListener('lostpointercapture', onPointerUp)

            content.removeEventListener('touchstart', onTouchStart)
            content.removeEventListener('touchmove', onTouchMove)
            content.removeEventListener('touchend', onTouchEnd)
            content.removeEventListener('touchcancel', onTouchEnd)

            pointers.clear()
            lastPointers.clear()

            if (pinchRafId !== null) {
                cancelAnimationFrame(pinchRafId)
                pinchRafId = null
            }
        },
    }
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

    const init = (stage: HTMLElement): PreviewAdapter => {
        const w = img.naturalWidth || 1
        const h = img.naturalHeight || 1

        return createTransformAdapter(img, stage, w, h, {
            minScale: 0.1,
            maxScale: 8,
            fitPadding: 32,
            fitMaxScale: 1,
        })
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

    cloned.style.cssText = `
        display: block;
        max-width: none;
        max-height: none;
        overflow: visible;
    `

    const init = (_stage: HTMLElement): PreviewAdapter => {
        return createSvgViewBoxAdapter(cloned)
    }

    return createPreview(cloned as unknown as HTMLElement, init, dispose)
}
