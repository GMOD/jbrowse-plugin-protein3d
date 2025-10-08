import useSWR from 'swr'

import { jsonfetch } from '../../fetchUtils'
import { stripTrailingVersion } from './util'

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
