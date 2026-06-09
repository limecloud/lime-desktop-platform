let installed = false
let activeOverlay: HTMLElement | undefined

const zoomableSelector = '.vp-doc .language-mermaid svg'
const minScale = 0.25
const maxScale = 5
const zoomStep = 1.2

interface DiagramSize {
  width: number
  height: number
}

function decorateZoomableDiagrams(): void {
  document.querySelectorAll<SVGSVGElement>(zoomableSelector).forEach((svg) => {
    if (svg.dataset.zoomableDiagram === 'true') {
      return
    }
    svg.dataset.zoomableDiagram = 'true'
    svg.setAttribute('role', 'button')
    svg.setAttribute('tabindex', '0')
    svg.setAttribute('aria-label', '打开架构图查看器')
  })
}

function closeDiagramZoom(): void {
  if (!activeOverlay) {
    return
  }
  activeOverlay.remove()
  activeOverlay = undefined
  document.body.classList.remove('diagram-zoom-open')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseSvgLength(value: string | null): number | undefined {
  if (!value) {
    return undefined
  }
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function readDiagramSize(svg: SVGSVGElement): DiagramSize {
  const viewBox = svg.viewBox.baseVal
  if (viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height }
  }

  const width = parseSvgLength(svg.getAttribute('width'))
  const height = parseSvgLength(svg.getAttribute('height'))
  if (width && height) {
    return { width, height }
  }

  const rect = svg.getBoundingClientRect()
  return {
    width: Math.max(rect.width, 980),
    height: Math.max(rect.height, 520)
  }
}

function createButton(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.className = 'diagram-zoom-button'
  button.type = 'button'
  button.textContent = label
  button.title = title
  button.setAttribute('aria-label', title)
  button.addEventListener('click', onClick)
  return button
}

function openDiagramZoom(sourceSvg: SVGSVGElement): void {
  closeDiagramZoom()

  const diagramSize = readDiagramSize(sourceSvg)
  const clonedSvg = sourceSvg.cloneNode(true) as SVGSVGElement
  clonedSvg.removeAttribute('tabindex')
  clonedSvg.removeAttribute('role')
  clonedSvg.removeAttribute('aria-label')
  clonedSvg.removeAttribute('data-zoomable-diagram')
  clonedSvg.classList.add('diagram-zoom-svg')
  clonedSvg.style.width = `${diagramSize.width}px`
  clonedSvg.style.height = `${diagramSize.height}px`

  let scale = 1
  let offsetX = 0
  let offsetY = 0
  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let dragOriginX = 0
  let dragOriginY = 0

  const overlay = document.createElement('div')
  overlay.className = 'diagram-zoom-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '架构图查看器')

  const panel = document.createElement('div')
  panel.className = 'diagram-zoom-panel'

  const toolbar = document.createElement('div')
  toolbar.className = 'diagram-zoom-toolbar'

  const title = document.createElement('div')
  title.className = 'diagram-zoom-title'
  title.textContent = '架构图查看器'

  const zoomLabel = document.createElement('span')
  zoomLabel.className = 'diagram-zoom-scale'

  const viewport = document.createElement('div')
  viewport.className = 'diagram-zoom-viewport'
  viewport.tabIndex = 0

  const canvas = document.createElement('div')
  canvas.className = 'diagram-zoom-canvas'
  canvas.append(clonedSvg)
  viewport.append(canvas)

  const applyTransform = (): void => {
    canvas.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`
    zoomLabel.textContent = `${Math.round(scale * 100)}%`
  }

  const setScale = (nextScale: number): void => {
    scale = clamp(nextScale, minScale, maxScale)
    applyTransform()
  }

  const zoomAtViewportPoint = (clientX: number, clientY: number, nextScale: number): void => {
    const rect = viewport.getBoundingClientRect()
    const clampedScale = clamp(nextScale, minScale, maxScale)
    const originX = rect.left + rect.width / 2
    const originY = rect.top + rect.height / 2
    const worldX = (clientX - originX - offsetX) / scale
    const worldY = (clientY - originY - offsetY) / scale
    offsetX = clientX - originX - worldX * clampedScale
    offsetY = clientY - originY - worldY * clampedScale
    scale = clampedScale
    applyTransform()
  }

  const zoomAtCenter = (nextScale: number): void => {
    const rect = viewport.getBoundingClientRect()
    zoomAtViewportPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, nextScale)
  }

  const resetToActualSize = (): void => {
    scale = 1
    offsetX = 0
    offsetY = 0
    applyTransform()
  }

  const fitToViewport = (): void => {
    const widthScale = (viewport.clientWidth - 48) / diagramSize.width
    const heightScale = (viewport.clientHeight - 48) / diagramSize.height
    scale = clamp(Math.min(widthScale, heightScale), minScale, maxScale)
    offsetX = 0
    offsetY = 0
    applyTransform()
  }

  const toolbarActions = document.createElement('div')
  toolbarActions.className = 'diagram-zoom-actions'
  toolbarActions.append(
    createButton('-', '缩小', () => zoomAtCenter(scale / zoomStep)),
    zoomLabel,
    createButton('+', '放大', () => zoomAtCenter(scale * zoomStep)),
    createButton('100%', '按原始大小查看', resetToActualSize),
    createButton('适应', '适应窗口', fitToViewport),
    createButton('重置', '重置大小和位置', resetToActualSize),
    createButton('关闭', '关闭查看器', closeDiagramZoom)
  )

  toolbar.append(title, toolbarActions)
  panel.append(toolbar, viewport)
  overlay.append(panel)

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeDiagramZoom()
    }
  })

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      const nextScale = event.deltaY > 0 ? scale / zoomStep : scale * zoomStep
      zoomAtViewportPoint(event.clientX, event.clientY, nextScale)
    },
    { passive: false }
  )

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return
    }
    isDragging = true
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragOriginX = offsetX
    dragOriginY = offsetY
    viewport.classList.add('is-dragging')
    viewport.setPointerCapture(event.pointerId)
  })

  viewport.addEventListener('pointermove', (event) => {
    if (!isDragging) {
      return
    }
    offsetX = dragOriginX + event.clientX - dragStartX
    offsetY = dragOriginY + event.clientY - dragStartY
    applyTransform()
  })

  const stopDragging = (event: PointerEvent): void => {
    if (!isDragging) {
      return
    }
    isDragging = false
    viewport.classList.remove('is-dragging')
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }
  }

  viewport.addEventListener('pointerup', stopDragging)
  viewport.addEventListener('pointercancel', stopDragging)

  document.body.append(overlay)
  document.body.classList.add('diagram-zoom-open')
  activeOverlay = overlay
  resetToActualSize()
  viewport.focus()
}

function findZoomableSvg(target: EventTarget | null): SVGSVGElement | undefined {
  if (!(target instanceof Element)) {
    return undefined
  }
  return target.closest<SVGSVGElement>(zoomableSelector) ?? undefined
}

export function installDiagramZoom(): void {
  if (typeof window === 'undefined' || installed) {
    return
  }
  installed = true

  decorateZoomableDiagrams()

  document.addEventListener('click', (event) => {
    const svg = findZoomableSvg(event.target)
    if (!svg) {
      return
    }
    openDiagramZoom(svg)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDiagramZoom()
      return
    }

    if (activeOverlay) {
      if (event.key === '+' || event.key === '=') {
        activeOverlay.querySelector<HTMLButtonElement>('[aria-label="放大"]')?.click()
        return
      }
      if (event.key === '-' || event.key === '_') {
        activeOverlay.querySelector<HTMLButtonElement>('[aria-label="缩小"]')?.click()
        return
      }
      if (event.key === '0') {
        activeOverlay.querySelector<HTMLButtonElement>('[aria-label="按原始大小查看"]')?.click()
        return
      }
      if (event.key.toLowerCase() === 'f') {
        activeOverlay.querySelector<HTMLButtonElement>('[aria-label="适应窗口"]')?.click()
        return
      }
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    const svg = findZoomableSvg(event.target)
    if (!svg) {
      return
    }

    event.preventDefault()
    openDiagramZoom(svg)
  })

  new MutationObserver(decorateZoomableDiagrams).observe(document.documentElement, {
    childList: true,
    subtree: true
  })
}
