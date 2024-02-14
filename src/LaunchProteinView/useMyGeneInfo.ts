import { useEffect, useState } from 'react'
import { jsonfetch } from '../fetchUtils'
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
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (!id) {
          return
        }
        const res = await jsonfetch(
          `https://mygene.info/v3/query?q=${stripTrailingVersion(id)}&fields=uniprot,symbol`,
        )
        setResult(res)
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
  }, [id])
  return { result: result?.hits[0]?.uniprot['Swiss-Prot'], error }
}
