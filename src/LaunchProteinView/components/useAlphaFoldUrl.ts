import useSWR from 'swr'

import { jsonfetch } from '../../fetchUtils'

interface AlphaFoldPrediction {
  cifUrl: string
  plddtDocUrl: string
  sequence: string
}

export default function useAlphaFoldUrl({ uniprotId }: { uniprotId?: string }) {
  const { data, error, isLoading } = useSWR<AlphaFoldPrediction[]>(
    uniprotId
      ? `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`
      : null,
    jsonfetch,
  )

  return {
    isLoading,
    url: data?.[0]?.cifUrl,
    confidenceUrl: data?.[0]?.plddtDocUrl,
    predictions: data,
    error,
  }
}
