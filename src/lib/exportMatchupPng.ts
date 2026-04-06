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

export async function downloadMatchupCurvePng(
  element: HTMLElement,
  titleHint: string,
): Promise<void> {
  await waitForImages(element)
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: EXPORT_BG,
  })
  const a = document.createElement('a')
  a.download = `${safeFilename(titleHint)}.png`
  a.href = dataUrl
  a.click()
}
