import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_DATABASES,
  submitFoldseekSearch,
  waitForFoldseekResults,
} from '../services/foldseekApi'

import type {
  FoldseekDatabaseId,
  FoldseekResult,
} from '../services/foldseekApi'

export default function useFoldseekSearch() {
  const [results, setResults] = useState<FoldseekResult>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [statusMessage, setStatusMessage] = useState('')
  const abortRef = useRef(false)

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const search = useCallback(
    async (
      sequence: string,
      databases: FoldseekDatabaseId[] = DEFAULT_DATABASES,
    ) => {
      setIsLoading(true)
      setError(undefined)
      setResults(undefined)
      setStatusMessage('Submitting search...')
      abortRef.current = false

      try {
        const ticket = await submitFoldseekSearch(sequence, databases)

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
    setError(undefined)
    setIsLoading(false)
    setStatusMessage('')
  }, [])

  return {
    results,
    isLoading,
    error,
    statusMessage,
    search,
    reset,
  }
}
