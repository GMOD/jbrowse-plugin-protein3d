import { useMemo } from 'react'

import {
  extractFeatureIdentifiers,
  getUniProtIdFromFeature,
} from '../utils/util'

import type { Feature } from '@jbrowse/core/util'

export default function useFeatureIdentifiers(
  feature: Feature,
  selectedTranscript?: Feature,
) {
  const transcriptIds = useMemo(
    () => extractFeatureIdentifiers(selectedTranscript),
    [selectedTranscript],
  )
  const geneIds = useMemo(() => extractFeatureIdentifiers(feature), [feature])

  const recognizedIds = useMemo(
    () => [
      ...new Set([...transcriptIds.recognizedIds, ...geneIds.recognizedIds]),
    ],
    [transcriptIds.recognizedIds, geneIds.recognizedIds],
  )

  const geneName = transcriptIds.geneName ?? geneIds.geneName

  const featureUniprotId =
    getUniProtIdFromFeature(selectedTranscript) ??
    getUniProtIdFromFeature(feature)

  return {
    recognizedIds,
    geneName,
    geneId: geneIds.geneId,
    featureUniprotId,
  }
}
