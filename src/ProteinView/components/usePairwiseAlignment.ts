import { useState, useEffect } from 'react'
import { launchPairwiseAlignment } from './pairwiseAlignmentUtils'

export default function usePairwiseAlignment({
  seq1,
  seq2,
}: {
  seq1: string
  seq2: string
}) {
  const [alignment, setAlignment] = useState('')
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (!seq1 || !seq2) {
          return
        }
        const alignment = await launchPairwiseAlignment({
          seq1,
          seq2,
          algorithm: 'emboss_needle',
          onProgress: () => {},
        })
        setAlignment(alignment.alignment)
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
  }, [seq1, seq2])

  return { alignment, error }
}
