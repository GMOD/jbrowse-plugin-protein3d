import { useEffect, useState } from 'react'

import { jsonfetch } from '../../fetchUtils'

interface AlphaFoldPrediction {
  cifUrl: string
  sequence: string
}

export default function useAlphaFoldUrl({ uniprotId }: { uniprotId?: string }) {
  const [result, setResult] = useState<AlphaFoldPrediction[]>()
  const [error, setError] = useState<unknown>()
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (uniprotId) {
          setLoading(true)
          const res = await jsonfetch(
            `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`,
          )
          setResult(res)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [uniprotId])

  return {
    isLoading,
    url: result?.[0]?.cifUrl,
    predictions: result,
    error,
  }
}
