import { jsonfetch } from '../../fetchUtils'
import { stripTrailingVersion } from '../utils/util'

interface MyGeneInfoResults {
  hits?: {
    uniprot?: {
      'Swiss-Prot': string
    }
  }[]
}

export async function lookupUniProtIdViaMyGeneInfo(
  geneId: string,
): Promise<string | undefined> {
  const url = `https://mygene.info/v3/query?q=${stripTrailingVersion(geneId)}&fields=uniprot,symbol`
  const data = (await jsonfetch(url)) as MyGeneInfoResults | undefined
  return data?.hits?.[0]?.uniprot?.['Swiss-Prot']
}
