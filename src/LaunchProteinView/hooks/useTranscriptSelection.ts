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
      const match =
        options.find(
          f =>
            isoformSequences[f.id()]?.seq.replaceAll('*', '') ===
            structureSequence,
        ) ?? options.find(f => !!isoformSequences[f.id()])
      setUserSelection(match?.id())
    }
  }, [options, structureSequence, isoformSequences, userSelection])

  return { userSelection, setUserSelection }
}
