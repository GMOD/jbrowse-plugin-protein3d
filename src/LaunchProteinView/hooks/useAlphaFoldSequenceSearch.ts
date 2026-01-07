import { useMemo } from 'react'

import useSWR from 'swr'

import { jsonfetch } from '../../fetchUtils'
import { md5 } from '../utils/md5'

export type SequenceSearchType = 'md5' | 'sequence'

interface SequenceSummaryResponse {
  entryId?: string
  uniprotAccession?: string
  uniprotId?: string
  uniprotDescription?: string
  taxId?: number
  organismScientificName?: string
  uniprotStart?: number
  uniprotEnd?: number
  modelUrl?: string
  cifUrl?: string
  plddtDocUrl?: string
  sequence?: string
}

export default function useAlphaFoldSequenceSearch({
  sequence,
  searchType,
  enabled = true,
}: {
  sequence?: string
  searchType: SequenceSearchType
  enabled?: boolean
}) {
  const searchValue = useMemo(() => {
    if (!sequence) {
      return undefined
    }
    const cleanSeq = sequence.toUpperCase().replaceAll('*', '')
    return searchType === 'md5' ? md5(cleanSeq) : cleanSeq
  }, [sequence, searchType])

  const { data, error, isLoading } = useSWR<SequenceSummaryResponse>(
    enabled && searchValue
      ? `https://alphafold.ebi.ac.uk/api/sequence/summary?id=${encodeURIComponent(searchValue)}&type=${searchType}`
      : null,
    jsonfetch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    },
  )

  return {
    isLoading,
    result: data,
    uniprotId: data?.uniprotAccession,
    cifUrl: data?.cifUrl,
    plddtDocUrl: data?.plddtDocUrl,
    structureSequence: data?.sequence,
    error,
  }
}
