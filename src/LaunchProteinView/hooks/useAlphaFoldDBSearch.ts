import { useEffect, useMemo, useState } from 'react'

import useAlphaFoldData from './useAlphaFoldData'
import useAlphaFoldSequenceSearch from './useAlphaFoldSequenceSearch'
import useIsoformProteinSequences from './useIsoformProteinSequences'
import useLoadingStatuses from './useLoadingStatuses'
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
  // All state in one place
  const [lookupMode, setLookupMode] = useState<LookupMode>('auto')
  const [manualUniprotId, setManualUniprotId] = useState('')
  const [selectedQueryId, setSelectedQueryId] = useState('auto')
  const [sequenceSearchType, setSequenceSearchType] =
    useState<SequenceSearchType>('md5')
  const [selectedUniprotId, setSelectedUniprotId] = useState<string>()
  const [userSelection, setUserSelection] = useState<string>()

  // Transcript options from feature
  const transcriptOptions = useMemo(
    () => getTranscriptFeatures(feature),
    [feature],
  )
  const selectedTranscript = transcriptOptions.find(
    f => getId(f) === userSelection,
  )

  // Load isoform protein sequences
  const {
    isoformSequences,
    isLoading: isIsoformLoading,
    error: isoformError,
  } = useIsoformProteinSequences({ feature, view })

  // Extract identifiers from feature and transcript
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

  // UniProt search
  const {
    entries: uniprotEntries,
    isLoading: isLookupLoading,
    error: lookupError,
  } = useUniProtSearch({
    recognizedIds,
    geneId: geneIds.geneId,
    geneName,
    selectedQueryId,
    enabled: lookupMode === 'auto' && !featureUniprotId,
  })

  const autoUniprotId = uniprotEntries[0]?.accession
  const userSelectedProteinSequence = isoformSequences?.[userSelection ?? '']

  // Determine which UniProt ID to use for AlphaFold lookup
  const uniprotIdForAlphaFold =
    lookupMode === 'feature'
      ? featureUniprotId
      : lookupMode === 'auto'
        ? (selectedUniprotId ?? autoUniprotId)
        : lookupMode === 'manual'
          ? manualUniprotId
          : undefined

  // AlphaFold data lookup
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
    uniprotId: lookupMode === 'sequence' ? undefined : uniprotIdForAlphaFold,
  })

  // Sequence search
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
    enabled: lookupMode === 'sequence',
  })

  // Final resolved values based on lookup mode
  const isSequenceMode = lookupMode === 'sequence'
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

  // Auto-switch to 'feature' mode if UniProt ID found in feature
  useEffect(() => {
    if (featureUniprotId && lookupMode === 'auto') {
      setLookupMode('feature')
    }
  }, [featureUniprotId, lookupMode])

  // Reset transcript selection when UniProt selection changes
  // This allows re-evaluation of which transcripts match the new structure
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

  // Aggregate errors and loading states
  const error =
    lookupError ?? isoformError ?? alphaFoldError ?? sequenceSearchError
  const loadingStatuses = useLoadingStatuses({
    isLookupLoading,
    isIsoformProteinSequencesLoading: isIsoformLoading,
    isAlphaFoldUrlLoading: isSequenceMode ? false : isAlphaFoldLoading,
    isSequenceSearchLoading: isSequenceMode ? isSequenceSearchLoading : false,
  })

  return {
    // State and setters for UI controls
    lookupMode,
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

    // Data for rendering
    transcriptOptions,
    selectedTranscript,
    isoformSequences,
    userSelectedProteinSequence,
    uniprotEntries,
    predictions,
    selectedEntryIndex,
    setSelectedEntryIndex,

    // Identifiers
    recognizedIds,
    geneName,
    featureUniprotId,

    // Resolved structure data
    uniprotId,
    url,
    confidenceUrl,
    structureSequence,

    // Status
    error,
    loadingStatuses,
    isLookupLoading,
    isSequenceSearchLoading,

    // Derived display flags
    showIdentifierSelector:
      lookupMode === 'auto' &&
      !featureUniprotId &&
      (recognizedIds.length > 0 || geneName),
    showAutoSearchResults:
      !!isoformSequences && lookupMode === 'auto' && !featureUniprotId,
    showStructureSelectors:
      !!isoformSequences &&
      !!selectedTranscript &&
      (lookupMode === 'sequence' || !!(structureSequence && uniprotId)),
    sequencesMatch:
      userSelectedProteinSequence?.seq && structureSequence
        ? stripStopCodon(userSelectedProteinSequence.seq) === structureSequence
        : undefined,

    // Pre-computed search descriptions for display
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

    // For table selection display
    selectedTableAccession: selectedUniprotId ?? autoUniprotId,

    // Additional display flags for cleaner conditionals
    showUniprotResults:
      !!isoformSequences &&
      lookupMode === 'auto' &&
      !featureUniprotId &&
      (uniprotEntries.length > 0 || isLookupLoading),
    showNoResults:
      !!isoformSequences &&
      lookupMode === 'auto' &&
      !featureUniprotId &&
      !isLookupLoading &&
      uniprotEntries.length === 0,
    showAlphaFoldEntrySelector: !!predictions && lookupMode !== 'sequence',
    showSequenceSearchStatus: lookupMode === 'sequence',
    showAlphaFoldDBSearchStatus:
      !!structureSequence && !!uniprotId && lookupMode !== 'sequence',
  }
}
