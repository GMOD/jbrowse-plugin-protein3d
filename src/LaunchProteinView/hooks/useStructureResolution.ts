import useAlphaFoldData from './useAlphaFoldData'
import useAlphaFoldSequenceSearch from './useAlphaFoldSequenceSearch'

import type { LookupMode } from '../components/UniProtIdInput'
import type { SequenceSearchType } from './useAlphaFoldSequenceSearch'

export default function useStructureResolution({
  lookupMode,
  uniprotIdForAlphaFold,
  proteinSequence,
  sequenceSearchType,
}: {
  lookupMode: LookupMode
  uniprotIdForAlphaFold?: string
  proteinSequence?: string
  sequenceSearchType: SequenceSearchType
}) {
  const sequenceSearch = useAlphaFoldSequenceSearch({
    sequence: proteinSequence,
    searchType: sequenceSearchType,
    enabled: lookupMode === 'sequence',
  })

  const alphaFoldData = useAlphaFoldData({
    uniprotId: lookupMode === 'sequence' ? undefined : uniprotIdForAlphaFold,
  })

  const isSequenceMode = lookupMode === 'sequence'

  return {
    url: isSequenceMode ? sequenceSearch.cifUrl : alphaFoldData.url,
    confidenceUrl: isSequenceMode
      ? sequenceSearch.plddtDocUrl
      : alphaFoldData.confidenceUrl,
    structureSequence: isSequenceMode
      ? sequenceSearch.structureSequence
      : alphaFoldData.structureSequence,
    uniprotIdFromSequenceSearch: sequenceSearch.uniprotId,
    predictions: alphaFoldData.predictions,
    selectedEntryIndex: alphaFoldData.selectedEntryIndex,
    setSelectedEntryIndex: alphaFoldData.setSelectedEntryIndex,
    isAlphaFoldLoading: isSequenceMode ? false : alphaFoldData.isLoading,
    isSequenceSearchLoading: isSequenceMode ? sequenceSearch.isLoading : false,
    alphaFoldError: alphaFoldData.error,
    sequenceSearchError: sequenceSearch.error,
  }
}
