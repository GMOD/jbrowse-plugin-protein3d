import { useEffect, useState } from 'react'

import useAlphaFoldUrl from './useAlphaFoldUrl'

/**
 * Custom hook to manage AlphaFold predictions and selected entry
 */
export default function useAlphaFoldData({
  uniprotId,
}: {
  uniprotId?: string
}) {
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number>(0)
  const { predictions, isLoading, error } = useAlphaFoldUrl({ uniprotId })

  // Auto-select first AlphaFold entry when predictions load
  useEffect(() => {
    if (predictions && predictions.length > 0) {
      setSelectedEntryIndex(0)
    }
  }, [predictions])

  const selectedPrediction = predictions?.[selectedEntryIndex]

  return {
    predictions,
    isLoading,
    error,
    selectedEntryIndex,
    setSelectedEntryIndex,
    selectedPrediction,
    url: selectedPrediction?.cifUrl,
    confidenceUrl: selectedPrediction?.plddtDocUrl,
    structureSequence: selectedPrediction?.sequence,
  }
}
