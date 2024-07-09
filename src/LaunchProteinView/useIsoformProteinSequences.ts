import { useEffect, useState } from 'react'
import { Feature } from '@jbrowse/core/util'

// locals
import { getTranscriptFeatures } from './util'
import { fetchProteinSeq } from './calculateProteinSequence'

export default function useIsoformProteinSequences({
  feature,
  view,
}: {
  feature: Feature
  view?: { assemblyNames?: string[] }
}) {
  const [error, setError] = useState<unknown>()
  const [isoformSequences, setIsoformSequences] =
    useState<Record<string, { feature: Feature; seq: string }>>()
  const [isLoading, setLoading] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        setLoading(true)
        const ret = [] as [string, { feature: Feature; seq: string }][]
        for (const f of getTranscriptFeatures(feature)) {
          const seq = await fetchProteinSeq({ view, feature: f })
          if (seq) {
            ret.push([f.id(), { feature: f, seq }])
          }
        }
        setIsoformSequences(Object.fromEntries(ret))
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [feature, view])
  return { isLoading, isoformSequences, error }
}
