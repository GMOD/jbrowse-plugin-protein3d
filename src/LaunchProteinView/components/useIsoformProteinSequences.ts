import { Feature } from '@jbrowse/core/util'
import useSWR from 'swr'

import { fetchProteinSeq } from './calculateProteinSequence'
import { getTranscriptFeatures } from './util'

export default function useIsoformProteinSequences({
  feature,
  view,
}: {
  feature: Feature
  view?: { assemblyNames?: string[] }
}) {
  const { data, error, isLoading } = useSWR<
    Record<string, { feature: Feature; seq: string }>
  >(
    // Use feature ID and view assembly names as the cache key
    ['isoform-sequences', feature.id(), view?.assemblyNames?.[0]],
    async () => {
      const ret = [] as [string, { feature: Feature; seq: string }][]
      for (const f of getTranscriptFeatures(feature)) {
        const seq = await fetchProteinSeq({ view, feature: f })
        if (seq) {
          ret.push([f.id(), { feature: f, seq }])
        }
      }
      return Object.fromEntries(ret)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  )

  return { isLoading, isoformSequences: data, error }
}
