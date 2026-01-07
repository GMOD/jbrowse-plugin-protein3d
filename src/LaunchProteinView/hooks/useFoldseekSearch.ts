import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_DATABASES,
  predict3Di,
  submitFoldseekSearch,
  waitForFoldseekResults,
} from '../services/foldseekApi'

import type {
  FoldseekDatabaseId,
  FoldseekResult,
} from '../services/foldseekApi'

export default function useFoldseekSearch() {
  const [results, setResults] = useState<FoldseekResult>()
  const [cleanedAaSequence, setCleanedAaSequence] = useState<string>()
  const [di3Sequence, setDi3Sequence] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [error, setError] = useState<unknown>()
  const [statusMessage, setStatusMessage] = useState('')
  const abortRef = useRef(false)

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const predictStructure = useCallback(async (aaSequence: string) => {
    setIsPredicting(true)
    setError(undefined)
    setCleanedAaSequence(undefined)
    setDi3Sequence(undefined)
    setStatusMessage('Predicting 3Di structure...')

    try {
      const result = await predict3Di(aaSequence)
      setCleanedAaSequence(result.aaSequence)
      setDi3Sequence(result.di3Sequence)
      setStatusMessage('')
      return result
    } catch (e) {
      setError(e)
      setStatusMessage('')
      return undefined
    } finally {
      setIsPredicting(false)
    }
  }, [])

  const search = useCallback(
    async (
      aaSeq: string,
      di3Seq: string,
      databases: FoldseekDatabaseId[] = DEFAULT_DATABASES,
    ) => {
      setIsLoading(true)
      setError(undefined)
      setResults(undefined)
      setStatusMessage('Submitting search...')
      abortRef.current = false

      try {
        const ticket = await submitFoldseekSearch(aaSeq, di3Seq, databases)

        if (abortRef.current) {
          return
        }

        const results = await waitForFoldseekResults(
          ticket.id,
          databases,
          status => {
            if (!abortRef.current) {
              setStatusMessage(status)
            }
          },
        )

        if (!abortRef.current) {
          setResults(results)
          setStatusMessage('')
        }
      } catch (e) {
        if (!abortRef.current) {
          setError(e)
          setStatusMessage('')
        }
      } finally {
        if (!abortRef.current) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setResults(undefined)
    setCleanedAaSequence(undefined)
    setDi3Sequence(undefined)
    setError(undefined)
    setIsLoading(false)
    setIsPredicting(false)
    setStatusMessage('')
  }, [])

  return {
    results,
    cleanedAaSequence,
    di3Sequence,
    isLoading,
    isPredicting,
    error,
    statusMessage,
    predictStructure,
    search,
    reset,
  }
}
