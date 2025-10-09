import useSWR from 'swr'

import { jsonfetch } from '../../fetchUtils'

export interface AlphaFoldPrediction {
  cifUrl: string
  plddtDocUrl: string
  sequence: string
  modelEntityId: string
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
    predictions: data,
    error,
  }
}
