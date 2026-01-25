import useSWR from 'swr'

import { searchUniProtEntries } from '../services/lookupMethods'
import { isRecognizedDatabaseId } from '../utils/util'

import type { UniProtEntry } from '../services/lookupMethods'

export default function useUniProtSearch({
  recognizedIds = [],
  geneId,
  geneName,
  selectedQueryId = 'auto',
  enabled = true,
}: {
  recognizedIds?: string[]
  geneId?: string
  geneName?: string
  selectedQueryId?: string
  enabled?: boolean
}) {
  // Determine what to search based on selectedQueryId
  let idsToSearch: string[] = []
  let geneNameToSearch: string | undefined

  if (selectedQueryId === 'auto') {
    // Auto mode: use all recognized IDs and gene name as fallback
    idsToSearch = recognizedIds
    geneNameToSearch = geneName
  } else if (selectedQueryId.startsWith('gene:')) {
    // Gene name only search
    geneNameToSearch = selectedQueryId.replace('gene:', '')
  } else if (isRecognizedDatabaseId(selectedQueryId)) {
    // Specific ID search
    idsToSearch = [selectedQueryId]
  }

  // Has valid ID if we have any recognized database IDs or a gene name
  const hasRecognizedId = idsToSearch.some(id => isRecognizedDatabaseId(id))
  const hasValidId = hasRecognizedId || Boolean(geneNameToSearch)

  const { data, error, isLoading } = useSWR<UniProtEntry[]>(
    enabled && hasValidId
      ? ['uniprotSearch', selectedQueryId, idsToSearch.join(','), geneNameToSearch]
      : null,
    async () =>
      searchUniProtEntries({
        recognizedIds: idsToSearch,
        geneId,
        geneName: geneNameToSearch,
      }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    },
  )

  return {
    entries: data ?? [],
    isLoading,
    error,
    hasValidId,
  }
}
