import Panzoom from '@panzoom/panzoom'

function createPreview(
    content: HTMLElement,
    initPanzoom: (stage: HTMLElement) => ReturnType<typeof Panzoom>,
    dispose?: () => void
) {
    const body = document.body
    const previousOverflow = body.style.overflow

    const dialog = document.createElement('dialog')
    const stage = document.createElement('div')
    const closeBtn = document.createElement('button')

    let panzoom: ReturnType<typeof Panzoom> | null = null
    let closed = false;

    (dialog as any).closedBy = 'closeRequest';

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
        will-change: transform;
        cursor: grab;
    `
    content.autofocus = true;

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
        panzoom?.zoomWithWheel(e)
    }

    const cleanup = () => {
        if (closed) return
        closed = true

        stage.removeEventListener('wheel', onWheel)

        panzoom?.destroy()
        panzoom?.resetStyle()
        panzoom = null

        dialog.remove()
        body.style.overflow = previousOverflow
        dispose?.()
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dialog.close()
    })

    dialog.addEventListener('close', cleanup)

    panzoom = initPanzoom(stage)
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

    const init = (stage: HTMLElement) => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const nw = img.naturalWidth || 1
        const nh = img.naturalHeight || 1

        const fitScale = Math.min((vw - 32) / nw, (vh - 32) / nh, 1)

        return Panzoom(img, {
            startScale: fitScale,
            minScale: 0.3,
            maxScale: 8,
            roundPixels: true,
            cursor: 'grab',
            touchAction: 'none',
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

/*
export function previewSvg(svg: SVGSVGElement, dispose?: () => void) {
    // clone，避免污染原始 DOM
    const cloned = svg.cloneNode(true) as SVGSVGElement

    cloned.removeAttribute('width')
    cloned.removeAttribute('height')

    cloned.style.cssText = `
        display: block;
        max-width: none;
        max-height: none;
    `

    const init = () => {
        return Panzoom(cloned, {
            startScale: 1,
            minScale: 0.3,
            maxScale: 16, // SVG 可以更大
            roundPixels: false, // 保持矢量精度
            cursor: 'grab',
            touchAction: 'none',
        })
    }

    return createPreview(cloned as unknown as HTMLElement, init, dispose)
}*/

export function previewSvg(svg: SVGSVGElement, dispose?: () => void) {
    const cloned = svg.cloneNode(true) as SVGSVGElement

    cloned.removeAttribute('width')
    cloned.removeAttribute('height')

    const vb = cloned.viewBox.baseVal
    let viewBox = {
        x: vb.x || 0,
        y: vb.y || 0,
        w: vb.width || cloned.clientWidth || 100,
        h: vb.height || cloned.clientHeight || 100,
    }

    cloned.setAttribute(
        'viewBox',
        `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    )

    cloned.style.cssText = `
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
        touch-action: none;
        user-select: none;
    `

    let pointers = new Map<number, { x: number; y: number }>()
    let startDist = 0
    let startVB = { ...viewBox }
    let startMid = { x: 0, y: 0 }

    function dist(a: any, b: any) {
        return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function mid(a: any, b: any) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    function getScaleFactor() {
        const rect = cloned.getBoundingClientRect()
        return Math.max(viewBox.w / rect.width, viewBox.h / rect.height)
    }

    function updateViewBox() {
        cloned.setAttribute(
            'viewBox',
            `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
        )
    }

    function onPointerDown(e: PointerEvent) {
        cloned.setPointerCapture(e.pointerId)
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (pointers.size === 2) {
            const [p1, p2] = [...pointers.values()]
            startDist = dist(p1, p2)
            startVB = { ...viewBox }
            startMid = mid(p1, p2)
        }
    }

    function onPointerMove(e: PointerEvent) {
        if (!pointers.has(e.pointerId)) return
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (pointers.size === 1) {
            const factor = getScaleFactor()

            viewBox.x -= e.movementX * factor
            viewBox.y -= e.movementY * factor

            updateViewBox()
        }

        if (pointers.size === 2) {
            const [p1, p2] = [...pointers.values()]
            const newDist = dist(p1, p2)

            const scale = startDist / newDist

            const newW = startVB.w * scale
            const newH = startVB.h * scale

            const rect = cloned.getBoundingClientRect()
            const cx = (startMid.x - rect.left) / rect.width
            const cy = (startMid.y - rect.top) / rect.height

            viewBox.w = newW
            viewBox.h = newH
            viewBox.x = startVB.x + (startVB.w - newW) * cx
            viewBox.y = startVB.y + (startVB.h - newH) * cy

            updateViewBox()
        }
    }

    function onPointerUp(e: PointerEvent) {
        pointers.delete(e.pointerId)
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault()

        const scale = e.deltaY > 0 ? 1.1 : 0.9

        const rect = cloned.getBoundingClientRect()
        const cx = (e.clientX - rect.left) / rect.width
        const cy = (e.clientY - rect.top) / rect.height

        const newW = viewBox.w * scale
        const newH = viewBox.h * scale

        viewBox.x += (viewBox.w - newW) * cx
        viewBox.y += (viewBox.h - newH) * cy
        viewBox.w = newW
        viewBox.h = newH

        updateViewBox()
    }

    const init = () => {
        cloned.addEventListener('pointerdown', onPointerDown)
        cloned.addEventListener('pointermove', onPointerMove)
        cloned.addEventListener('pointerup', onPointerUp)
        cloned.addEventListener('pointercancel', onPointerUp)
        cloned.addEventListener('wheel', onWheel, { passive: false })

        return {
            destroy() {
                cloned.removeEventListener('pointerdown', onPointerDown)
                cloned.removeEventListener('pointermove', onPointerMove)
                cloned.removeEventListener('pointerup', onPointerUp)
                cloned.removeEventListener('pointercancel', onPointerUp)
                cloned.removeEventListener('wheel', onWheel)
            },
            resetStyle() {},
        } as any
    }

    return createPreview(cloned as unknown as HTMLElement, init, dispose)
}
