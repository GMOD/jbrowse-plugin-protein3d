import useSWR from 'swr'

import { lookupUniProtIdViaMyGeneInfo } from '../services/lookupMethods'

export default function useLookupUniProtId({
  id,
  providedUniprotId,
  lookupMethod,
}: {
  id: string
  providedUniprotId?: string
  lookupMethod?: (geneId: string) => Promise<string | undefined>
}) {
  const { data, error, isLoading } = useSWR<string | undefined>(
    providedUniprotId || !id || !lookupMethod
      ? null
      : ['uniprotLookup', id, lookupMethod.name],
    () => lookupMethod?.(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    },
  )

  return {
    isLoading,
    uniprotId: providedUniprotId ?? data,
    error,
  }
}

export { lookupUniProtIdViaMyGeneInfo }
