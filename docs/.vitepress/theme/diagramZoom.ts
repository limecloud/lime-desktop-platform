let installed = false
let activeOverlay: HTMLElement | undefined

const zoomableSelector = '.vp-doc .language-mermaid svg'

function decorateZoomableDiagrams(): void {
  document.querySelectorAll<SVGSVGElement>(zoomableSelector).forEach((svg) => {
    if (svg.dataset.zoomableDiagram === 'true') {
      return
    }
    svg.dataset.zoomableDiagram = 'true'
    svg.setAttribute('role', 'button')
    svg.setAttribute('tabindex', '0')
    svg.setAttribute('aria-label', '点击放大架构图')
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

function openDiagramZoom(sourceSvg: SVGSVGElement): void {
  closeDiagramZoom()

  const clonedSvg = sourceSvg.cloneNode(true) as SVGSVGElement
  clonedSvg.removeAttribute('tabindex')
  clonedSvg.removeAttribute('role')
  clonedSvg.removeAttribute('aria-label')
  clonedSvg.removeAttribute('data-zoomable-diagram')

  const overlay = document.createElement('div')
  overlay.className = 'diagram-zoom-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '架构图放大预览')

  const panel = document.createElement('div')
  panel.className = 'diagram-zoom-panel'

  const toolbar = document.createElement('div')
  toolbar.className = 'diagram-zoom-toolbar'

  const hint = document.createElement('span')
  hint.className = 'diagram-zoom-hint'
  hint.textContent = '拖动滚动条查看完整图'

  const closeButton = document.createElement('button')
  closeButton.className = 'diagram-zoom-close'
  closeButton.type = 'button'
  closeButton.textContent = '关闭'
  closeButton.addEventListener('click', closeDiagramZoom)

  const viewport = document.createElement('div')
  viewport.className = 'diagram-zoom-viewport'
  viewport.append(clonedSvg)

  toolbar.append(hint, closeButton)
  panel.append(toolbar, viewport)
  overlay.append(panel)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeDiagramZoom()
    }
  })

  document.body.append(overlay)
  document.body.classList.add('diagram-zoom-open')
  activeOverlay = overlay
  closeButton.focus()
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
