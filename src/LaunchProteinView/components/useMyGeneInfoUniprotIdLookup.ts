import useSWR from 'swr'

import { stripTrailingVersion } from './util'
import { jsonfetch } from '../../fetchUtils'

interface MyGeneInfoResults {
  hits?: {
    uniprot?: {
      'Swiss-Prot': string
    }
  }[]
}

export default function useMyGeneInfo({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR<MyGeneInfoResults>(
    id
      ? `https://mygene.info/v3/query?q=${stripTrailingVersion(id)}&fields=uniprot,symbol`
      : null,
    jsonfetch,
  )

  return {
    isLoading,
    uniprotId: data?.hits?.[0]?.uniprot?.['Swiss-Prot'],
    error,
  }
}
