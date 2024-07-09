import { useEffect, useState } from 'react'
import { jsonfetch } from '../../fetchUtils'
import { stripTrailingVersion } from './util'

interface MyGeneInfoResults {
  hits: {
    uniprot: {
      'Swiss-Prot': string
    }
  }[]
}

export default function useMyGeneInfo({ id }: { id: string }) {
  const [result, setResult] = useState<MyGeneInfoResults>()
  const [error, setError] = useState<unknown>()
  const [isLoading, setLoading] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (id) {
          setLoading(true)
          const res = await jsonfetch(
            `https://mygene.info/v3/query?q=${stripTrailingVersion(id)}&fields=uniprot,symbol`,
          )
          setResult(res)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  return {
    isLoading,
    uniprotId: result?.hits[0]?.uniprot?.['Swiss-Prot'],
    error,
  }
}
