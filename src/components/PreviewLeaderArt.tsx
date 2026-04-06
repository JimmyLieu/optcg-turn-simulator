import { useOptcgCard } from '../hooks/useOptcgCard'

function PreviewLeaderArtInner({ cardId }: { cardId: string }) {
  const { status, displayImageUrl } = useOptcgCard(cardId)

  if (status === 'loading') {
    return (
      <div className="preview-leader-art preview-leader-art--loading" aria-hidden="true">
        …
      </div>
    )
  }
  if (status === 'error' || !displayImageUrl) {
    return <div className="preview-leader-art preview-leader-art--empty" aria-hidden="true" />
  }
  return (
    <img
      className="preview-leader-art__img"
      src={displayImageUrl}
      alt=""
      width={224}
      height={312}
    />
  )
}

/** Leader thumbnail for curve preview banners (OPTCG image URL from API). */
export function PreviewLeaderArt({ cardId }: { cardId?: string }) {
  const id = cardId?.trim() ?? ''
  if (!id) {
    return <div className="preview-leader-art preview-leader-art--empty" aria-hidden="true" />
  }
  return <PreviewLeaderArtInner cardId={id} />
}
