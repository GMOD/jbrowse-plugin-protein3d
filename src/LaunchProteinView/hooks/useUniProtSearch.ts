import useSWR from 'swr'

import { searchUniProtEntries } from '../services/lookupMethods'
import { stripTrailingVersion } from '../utils/util'

import type { UniProtEntry } from '../services/lookupMethods'

export default function useUniProtSearch({
  geneId,
  geneName,
  enabled = true,
}: {
  geneId?: string
  geneName?: string
  enabled?: boolean
}) {
  const strippedGeneId = stripTrailingVersion(geneId)
  const hasValidId =
    (strippedGeneId && /^ENSG\d+/i.test(strippedGeneId)) || !!geneName

  console.log('[useUniProtSearch] geneId:', geneId)
  console.log('[useUniProtSearch] geneName:', geneName)
  console.log('[useUniProtSearch] hasValidId:', hasValidId)
  console.log('[useUniProtSearch] enabled:', enabled)

  const { data, error, isLoading } = useSWR<UniProtEntry[]>(
    enabled && hasValidId
      ? ['uniprotSearch', strippedGeneId, geneName]
      : null,
    async () => {
      console.log('[useUniProtSearch] fetching for geneId:', strippedGeneId, 'geneName:', geneName)
      const results = await searchUniProtEntries(strippedGeneId, geneName)
      console.log('[useUniProtSearch] results:', results)
      return results
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    },
  )

  console.log('[useUniProtSearch] data:', data)
  console.log('[useUniProtSearch] isLoading:', isLoading)

  return {
    entries: data ?? [],
    isLoading,
    error,
    hasValidId,
  }
}
