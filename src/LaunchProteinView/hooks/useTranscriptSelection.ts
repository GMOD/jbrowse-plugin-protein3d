import { useEffect, useState } from 'react'

import type { Feature } from '@jbrowse/core/util'

export default function useTranscriptSelection({
  options,
  isoformSequences,
  structureSequence,
}: {
  options: Feature[]
  isoformSequences?: Record<string, { feature: Feature; seq: string }>
  structureSequence?: string
}) {
  const [userSelection, setUserSelection] = useState<string>()

  useEffect(() => {
    if (
      isoformSequences !== undefined &&
      structureSequence !== undefined &&
      userSelection === undefined
    ) {
      const exactMatch = options.find(
        f =>
          isoformSequences[f.id()]?.seq.replaceAll('*', '') ===
          structureSequence,
      )
      const longestWithData = options
        .filter(f => !!isoformSequences[f.id()])
        .sort(
          (a, b) =>
            isoformSequences[b.id()]!.seq.length -
            isoformSequences[a.id()]!.seq.length,
        )[0]
      setUserSelection((exactMatch ?? longestWithData)?.id())
    }
  }, [options, structureSequence, isoformSequences, userSelection])

  return { userSelection, setUserSelection }
}
