import { useMemo } from 'react'

import useSWR from 'swr'

import { jsonfetch } from '../../fetchUtils'
import { md5 } from '../utils/md5'

export type SequenceSearchType = 'md5' | 'sequence'

interface StructureEntity {
  entity_type: string
  entity_poly_type: string
  identifier: string
  identifier_category: string
  description: string
  chain_ids: string[]
}

interface StructureSummary {
  model_identifier: string
  model_url: string
  model_format: string
  model_page_url: string
  confidence_avg_local_score: number
  entities: StructureEntity[]
}

interface SequenceSummaryResponse {
  entry: {
    sequence: string
    checksum: string
    checksum_type: string
  }
  structures: {
    summary: StructureSummary
  }[]
}

function getUniprotIdFromStructure(structure: { summary: StructureSummary }) {
  const uniprotEntity = structure.summary.entities.find(
    e => e.identifier_category === 'UNIPROT',
  )
  return uniprotEntity?.identifier
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

  const firstStructure = data?.structures[0]
  const uniprotId = firstStructure
    ? getUniprotIdFromStructure(firstStructure)
    : undefined
  const cifUrl = firstStructure?.summary.model_url
  const structureSequence = data?.entry.sequence

  return {
    isLoading,
    result: data,
    uniprotId,
    cifUrl,
    structureSequence,
    structures: data?.structures,
    error,
  }
}
