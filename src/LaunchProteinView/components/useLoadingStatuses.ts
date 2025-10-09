/**
 * Custom hook to aggregate loading statuses from multiple sources
 */
export default function useLoadingStatuses({
  isMyGeneLoading,
  isIsoformProteinSequencesLoading,
  isAlphaFoldUrlLoading,
}: {
  isMyGeneLoading: boolean
  isIsoformProteinSequencesLoading: boolean
  isAlphaFoldUrlLoading: boolean
}): string[] {
  const statuses: string[] = []

  if (isMyGeneLoading) {
    statuses.push('Looking up UniProt ID from mygene.info')
  }

  if (isIsoformProteinSequencesLoading) {
    statuses.push('Loading protein sequences from transcript isoforms')
  }

  if (isAlphaFoldUrlLoading) {
    statuses.push('Fetching AlphaFold structure URL')
  }

  return statuses
}
