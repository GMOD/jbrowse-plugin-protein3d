import useRemoteStructureFileSequence from './useRemoteStructureFileSequence'

export default function useAlphaFoldData({ uniprotId }: { uniprotId?: string }) {
  const url = uniprotId
    ? `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`
    : undefined

  const {
    sequences,
    isLoading,
    error,
  } = useRemoteStructureFileSequence({ url })

  return {
    isLoading,
    error,
    url,
    structureSequence: sequences?.[0],
  }
}
