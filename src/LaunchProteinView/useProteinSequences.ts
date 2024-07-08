import { useEffect, useState } from 'react'
import { Feature } from '@jbrowse/core/util'

// locals
import { getTranscriptFeatures } from './util'
import { fetchProteinSeq } from './calculateProteinSequence'

export default function useAllSequences({
  feature,
  view,
}: {
  feature: Feature
  view: { assemblyNames?: string[] } | undefined
}) {
  const [error, setError] = useState<unknown>()
  const [seqs, setSeqs] = useState<Record<string, string>>()
  const [isLoading, setLoading] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        setLoading(true)
        const ret = [] as [string, string][]
        for (const f of getTranscriptFeatures(feature)) {
          const seq = await fetchProteinSeq({ view, feature: f })
          if (seq) {
            ret.push([f.id(), seq])
          }
        }
        setSeqs(Object.fromEntries(ret))
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [feature, view])
  return { isLoading, seqs, error }
}
