import { toPng } from 'html-to-image'

/** Matches :root --bg-deep so letterboxing matches the app. */
const EXPORT_BG = '#0c0e12'

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = root.querySelectorAll('img')
  const pending = [...imgs].map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight > 0) {
          resolve()
          return
        }
        const done = () => resolve()
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      }),
  )
  return Promise.all(pending).then(() => undefined)
}

function safeFilename(raw: string): string {
  const s = raw
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return s.length > 0 ? s : 'matchup-curve'
}

function triggerDownload(dataUrl: string, titleHint: string): void {
  const a = document.createElement('a')
  a.download = `${safeFilename(titleHint)}.png`
  a.href = dataUrl
  a.click()
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode PNG for export'))
    img.src = dataUrl
  })
}

export type DownloadMatchupPngOptions = {
  /** Site footer (below the board); composited under the curve in the PNG. */
  footerElement?: HTMLElement | null
}

export async function downloadMatchupCurvePng(
  element: HTMLElement,
  titleHint: string,
  options?: DownloadMatchupPngOptions,
): Promise<void> {
  const footerElement = options?.footerElement
  await waitForImages(element)
  if (footerElement) await waitForImages(footerElement)

  const pngOpts = {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: EXPORT_BG,
  } as const

  const boardDataUrl = await toPng(element, pngOpts)

  if (!footerElement) {
    triggerDownload(boardDataUrl, titleHint)
    return
  }

  const footDataUrl = await toPng(footerElement, pngOpts)
  const boardImg = await loadImageFromDataUrl(boardDataUrl)
  const footImg = await loadImageFromDataUrl(footDataUrl)

  const w = Math.max(boardImg.width, footImg.width)
  const h = boardImg.height + footImg.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    triggerDownload(boardDataUrl, titleHint)
    return
  }
  ctx.fillStyle = EXPORT_BG
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(boardImg, 0, 0)
  ctx.drawImage(footImg, 0, boardImg.height)

  triggerDownload(canvas.toDataURL('image/png'), titleHint)
}
