import { useOptcgCard } from '../hooks/useOptcgCard'
import type { OptcgCardRow } from '../lib/optcgApi'
import { proxiedOptcgImageUrl } from '../lib/optcgImageProxy'

type PreviewSize = 'xs' | 'sm' | 'md' | 'lg'

type PreviewFrameProps = {
  size: PreviewSize
  imageUrl?: string
  alt: string
  loading?: boolean
  emptyLabel?: string
}

function PreviewFrame({ size, imageUrl, alt, loading, emptyLabel = 'No art' }: PreviewFrameProps) {
  return (
    <div className={`mu-card-preview mu-card-preview--${size}`}>
      {loading ? (
        <span className="mu-card-preview__placeholder">…</span>
      ) : imageUrl ? (
        <img className="mu-card-preview__img" src={imageUrl} alt={alt} loading="lazy" />
      ) : (
        <span className="mu-card-preview__placeholder">{emptyLabel}</span>
      )}
    </div>
  )
}

export function CardPreviewFromRow({ row, size = 'xs' }: { row: OptcgCardRow; size?: PreviewSize }) {
  return (
    <PreviewFrame
      size={size}
      imageUrl={proxiedOptcgImageUrl(row.card_image)}
      alt={row.card_name}
    />
  )
}

export function CardPreviewFromId({
  cardId,
  titleHint,
  size = 'md',
}: {
  cardId: string
  titleHint?: string
  size?: PreviewSize
}) {
  const { status, displayImageUrl, displayTitle } = useOptcgCard(cardId, { title: titleHint })

  return (
    <PreviewFrame
      size={size}
      imageUrl={displayImageUrl}
      alt={displayTitle}
      loading={status === 'loading'}
    />
  )
}

type SearchResultProps = {
  row: OptcgCardRow
  onSelect: () => void
  compact?: boolean
}

export function CardSearchResultButton({ row, onSelect, compact }: SearchResultProps) {
  const meta = [row.card_set_id, row.card_type].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      className="mu-editor__leader-result"
      role="option"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
    >
      <CardPreviewFromRow row={row} size={compact ? 'xs' : 'sm'} />
      <span className="mu-editor__leader-result-text">
        <span className="mu-editor__leader-result-name">{row.card_name}</span>
        <span className="mu-editor__leader-result-id">{meta}</span>
      </span>
    </button>
  )
}
