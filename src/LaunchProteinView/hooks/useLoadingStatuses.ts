/**
 * Custom hook to aggregate loading statuses from multiple sources
 */
export default function useLoadingStatuses({
  isLookupLoading,
  isIsoformProteinSequencesLoading,
  isAlphaFoldUrlLoading,
  isSequenceSearchLoading,
}: {
  isLookupLoading: boolean
  isIsoformProteinSequencesLoading: boolean
  isAlphaFoldUrlLoading: boolean
  isSequenceSearchLoading?: boolean
}): string[] {
  const statuses: string[] = []

  if (isLookupLoading) {
    statuses.push('Looking up UniProt ID')
  }

  if (isIsoformProteinSequencesLoading) {
    statuses.push('Loading protein sequences from transcript isoforms')
  }

  if (isAlphaFoldUrlLoading) {
    statuses.push('Fetching AlphaFold structure URL')
  }

  if (isSequenceSearchLoading) {
    statuses.push('Searching AlphaFoldDB by sequence')
  }

  return statuses
}
