import { useEffect, useMemo, useState } from 'react'

import useAlphaFoldData from './useAlphaFoldData'
import useAlphaFoldSequenceSearch from './useAlphaFoldSequenceSearch'
import useIsoformProteinSequences from './useIsoformProteinSequences'
import useUniProtSearch from './useUniProtSearch'
import getSearchDescription from '../utils/getSearchDescription'
import {
  extractFeatureIdentifiers,
  getId,
  getTranscriptFeatures,
  getUniProtIdFromFeature,
  selectBestTranscript,
  stripStopCodon,
} from '../utils/util'

import type { SequenceSearchType } from './useAlphaFoldSequenceSearch'
import type { LookupMode } from '../components/UniProtIdInput'
import type { Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

export default function useAlphaFoldDBSearch({
  feature,
  view,
}: {
  feature: Feature
  view: LinearGenomeViewModel
}) {
  const [lookupMode, setLookupMode] = useState<LookupMode>('auto')
  const [manualUniprotId, setManualUniprotId] = useState('')
  const [selectedQueryId, setSelectedQueryId] = useState('auto')
  const [sequenceSearchType, setSequenceSearchType] =
    useState<SequenceSearchType>('md5')
  const [selectedUniprotId, setSelectedUniprotId] = useState<string>()
  const [userSelection, setUserSelection] = useState<string>()

  const transcriptOptions = useMemo(
    () => getTranscriptFeatures(feature),
    [feature],
  )
  const selectedTranscript = transcriptOptions.find(
    f => getId(f) === userSelection,
  )

  const {
    isoformSequences,
    isLoading: isIsoformLoading,
    error: isoformError,
  } = useIsoformProteinSequences({ feature, view })

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

  // Compute the effective lookup mode synchronously to avoid the one-frame gap
  // that a useEffect would cause. When 'auto' is selected and the feature
  // already has a UniProt ID, we use 'feature' mode immediately so downstream
  // hooks get the correct uniprotId on the same render cycle.
  // Note: effectiveLookupMode === 'auto' implies !featureUniprotId.
  const effectiveLookupMode =
    lookupMode === 'auto' && featureUniprotId ? 'feature' : lookupMode
  const isSequenceMode = effectiveLookupMode === 'sequence'
  const isAutoMode = effectiveLookupMode === 'auto'

  const {
    entries: uniprotEntries,
    isLoading: isLookupLoading,
    error: lookupError,
  } = useUniProtSearch({
    recognizedIds,
    geneId: geneIds.geneId,
    geneName,
    selectedQueryId,
    enabled: isAutoMode,
  })

  const autoUniprotId = uniprotEntries[0]?.accession
  const userSelectedProteinSequence = isoformSequences?.[userSelection ?? '']

  const uniprotIdForAlphaFold =
    effectiveLookupMode === 'feature'
      ? featureUniprotId
      : isAutoMode
        ? (selectedUniprotId ?? autoUniprotId)
        : effectiveLookupMode === 'manual'
          ? manualUniprotId
          : undefined

  const {
    predictions,
    isLoading: isAlphaFoldLoading,
    error: alphaFoldError,
    selectedEntryIndex,
    setSelectedEntryIndex,
    url: alphaFoldUrl,
    confidenceUrl: alphaFoldConfidenceUrl,
    structureSequence: alphaFoldStructureSequence,
  } = useAlphaFoldData({
    uniprotId: isSequenceMode ? undefined : uniprotIdForAlphaFold,
  })

  const {
    uniprotId: sequenceSearchUniprotId,
    cifUrl: sequenceSearchUrl,
    plddtDocUrl: sequenceSearchConfidenceUrl,
    structureSequence: sequenceSearchStructureSequence,
    isLoading: isSequenceSearchLoading,
    error: sequenceSearchError,
  } = useAlphaFoldSequenceSearch({
    sequence: userSelectedProteinSequence?.seq,
    searchType: sequenceSearchType,
    enabled: isSequenceMode,
  })

  const url = isSequenceMode ? sequenceSearchUrl : alphaFoldUrl
  const confidenceUrl = isSequenceMode
    ? sequenceSearchConfidenceUrl
    : alphaFoldConfidenceUrl
  const structureSequence = isSequenceMode
    ? sequenceSearchStructureSequence
    : alphaFoldStructureSequence
  const uniprotId = isSequenceMode
    ? sequenceSearchUniprotId
    : uniprotIdForAlphaFold

  // Reset transcript selection when UniProt selection changes
  useEffect(() => {
    setUserSelection(undefined)
  }, [selectedUniprotId])

  // Auto-select best transcript when structure sequence is available
  useEffect(() => {
    if (isoformSequences !== undefined && userSelection === undefined) {
      const best = selectBestTranscript({
        options: transcriptOptions,
        isoformSequences,
        structureSequence,
      })
      setUserSelection(best?.id())
    }
  }, [transcriptOptions, structureSequence, isoformSequences, userSelection])

  // Only report errors from hooks that have finished loading and whose
  // upstream dependencies are also resolved. This prevents brief error flashes
  // when a downstream hook errors on stale input that is about to change.
  const error = (() => {
    if (isoformError && !isIsoformLoading) {
      return isoformError
    }
    if (isSequenceMode) {
      if (sequenceSearchError && !isSequenceSearchLoading && !isIsoformLoading) {
        return sequenceSearchError
      }
      return undefined
    }
    if (lookupError && !isLookupLoading) {
      return lookupError
    }
    if (alphaFoldError && !isAlphaFoldLoading && !isLookupLoading) {
      return alphaFoldError
    }
    return undefined
  })()

  if (error) {
    console.log('[useAlphaFoldDBSearch] error:', {
      lookupError,
      isoformError,
      alphaFoldError,
      sequenceSearchError,
      isLookupLoading,
      isIsoformLoading,
      isAlphaFoldLoading,
      isSequenceSearchLoading,
      effectiveLookupMode,
    })
  }

  const loadingStatuses = [
    isLookupLoading && 'Looking up UniProt ID',
    isIsoformLoading && 'Loading protein sequences from transcript isoforms',
    !isSequenceMode && isAlphaFoldLoading && 'Fetching AlphaFold structure URL',
    isSequenceMode && isSequenceSearchLoading && 'Searching AlphaFoldDB by sequence',
  ].filter((s): s is string => !!s)

  return {
    lookupMode: effectiveLookupMode,
    setLookupMode,
    manualUniprotId,
    setManualUniprotId,
    selectedQueryId,
    setSelectedQueryId,
    sequenceSearchType,
    setSequenceSearchType,
    selectedUniprotId,
    setSelectedUniprotId,
    userSelection,
    setUserSelection,

    transcriptOptions,
    selectedTranscript,
    isoformSequences,
    userSelectedProteinSequence,
    uniprotEntries,
    predictions,
    selectedEntryIndex,
    setSelectedEntryIndex,

    recognizedIds,
    geneName,
    featureUniprotId,

    uniprotId,
    url,
    confidenceUrl,
    structureSequence,

    error,
    loadingStatuses,
    isSequenceSearchLoading,

    showIdentifierSelector:
      isAutoMode && (recognizedIds.length > 0 || !!geneName),
    showStructureSelectors:
      !!isoformSequences &&
      !!selectedTranscript &&
      (isSequenceMode || !!(structureSequence && uniprotId)),
    sequencesMatch:
      userSelectedProteinSequence?.seq && structureSequence
        ? stripStopCodon(userSelectedProteinSequence.seq) === structureSequence
        : undefined,

    searchDescription: getSearchDescription({
      selectedQueryId,
      recognizedIds,
      geneName,
    }),
    searchDescriptionOr: getSearchDescription({
      selectedQueryId,
      recognizedIds,
      geneName,
      joinWord: 'or',
    }),

    selectedTableAccession: selectedUniprotId ?? autoUniprotId,

    showUniprotResults:
      !!isoformSequences &&
      isAutoMode &&
      (uniprotEntries.length > 0 || isLookupLoading),
    showNoResults:
      !!isoformSequences &&
      isAutoMode &&
      !isLookupLoading &&
      uniprotEntries.length === 0,
    showAlphaFoldEntrySelector: !!predictions && !isSequenceMode,
    showSequenceSearchStatus: isSequenceMode,
    showAlphaFoldDBSearchStatus:
      !!structureSequence && !!uniprotId && !isSequenceMode,
    isLoading: loadingStatuses.length > 0,
  }
}
