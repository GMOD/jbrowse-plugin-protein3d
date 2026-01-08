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
  const hasEnsemblGeneId = Boolean(
    strippedGeneId && /^ENSG\d+/i.test(strippedGeneId),
  )
  const hasValidId = hasEnsemblGeneId || Boolean(geneName)

  const { data, error, isLoading } = useSWR<UniProtEntry[]>(
    enabled && hasValidId ? ['uniprotSearch', strippedGeneId, geneName] : null,
    async () => searchUniProtEntries(strippedGeneId, geneName),
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
