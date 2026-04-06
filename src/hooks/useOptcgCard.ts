import { useEffect, useState } from 'react'
import { fetchCardBySetIdDeduped, type OptcgCardRow } from '../lib/optcgApi'
import { proxiedOptcgImageUrl } from '../lib/optcgImageProxy'

export type OptcgCardState =
  | { status: 'loading' }
  | { status: 'ok'; row: OptcgCardRow }
  | { status: 'error'; message: string }

export function useOptcgCard(
  cardSetId: string,
  options?: { imageUrl?: string; title?: string },
): OptcgCardState & { displayTitle: string; displayImageUrl: string | undefined } {
  const imageUrlOverride = options?.imageUrl
  const titleHint = options?.title

  const [state, setState] = useState<OptcgCardState>(() => {
    if (imageUrlOverride) {
      return {
        status: 'ok',
        row: {
          card_set_id: cardSetId,
          card_name: titleHint ?? cardSetId,
          card_image: imageUrlOverride,
        },
      }
    }
    return { status: 'loading' }
  })

  useEffect(() => {
    if (imageUrlOverride) {
      setState({
        status: 'ok',
        row: {
          card_set_id: cardSetId,
          card_name: titleHint ?? cardSetId,
          card_image: imageUrlOverride,
        },
      })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })
    fetchCardBySetIdDeduped(cardSetId).then((row) => {
      if (cancelled) return
      if (row) setState({ status: 'ok', row })
      else setState({ status: 'error', message: 'Card not found' })
    })
    return () => {
      cancelled = true
    }
  }, [cardSetId, imageUrlOverride, titleHint])

  if (state.status === 'ok') {
    const title = titleHint ?? state.row.card_name
    return {
      ...state,
      displayTitle: title,
      displayImageUrl: proxiedOptcgImageUrl(state.row.card_image),
    }
  }
  if (state.status === 'error') {
    return {
      ...state,
      displayTitle: titleHint ?? cardSetId,
      displayImageUrl: undefined,
    }
  }
  return {
    ...state,
    displayTitle: titleHint ?? cardSetId,
    displayImageUrl: undefined,
  }
}
