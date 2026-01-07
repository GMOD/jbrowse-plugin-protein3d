import { jsonfetch } from '../../fetchUtils'
import { stripTrailingVersion } from '../utils/util'

interface UniProtSearchResult {
  results: {
    entryType: string
    primaryAccession: string
    genes?: {
      geneName?: {
        value: string
      }
    }[]
    organism?: {
      taxonId: number
    }
  }[]
}

// Ensembl ID prefixes - covers human (ENS), mouse (ENSMUS), zebrafish (ENSDAR), etc.
function isEnsemblId(id: string) {
  return /^ENS[A-Z]*[TGP]\d+/i.test(id)
}

// NCBI RefSeq ID prefixes (NM_, XM_, NR_, XR_, NP_, XP_)
function isRefSeqId(id: string) {
  return /^[NX][MRP]_\d+/i.test(id)
}

export async function lookupUniProtIdViaUniProt(
  geneId: string,
): Promise<string | undefined> {
  const id = stripTrailingVersion(geneId)
  console.log('[UniProt lookup] Starting lookup for:', geneId, '-> stripped:', id)
  if (!id) {
    return undefined
  }

  // Only perform lookups for recognized ID patterns to avoid organism ambiguity
  if (!isEnsemblId(id) && !isRefSeqId(id)) {
    console.log('[UniProt lookup] ID not recognized as Ensembl or RefSeq, skipping lookup')
    return undefined
  }

  const xrefType = isEnsemblId(id) ? 'ensembl' : 'refseq'
  console.log('[UniProt lookup] Detected', xrefType, 'ID')

  // Try cross-reference search with reviewed (Swiss-Prot) first
  const reviewedUrl = `https://rest.uniprot.org/uniprotkb/search?query=xref:${xrefType}-${id}+AND+reviewed:true&fields=accession,gene_names,organism_id&size=1`
  console.log('[UniProt lookup] Trying reviewed URL:', reviewedUrl)
  try {
    const data = (await jsonfetch(reviewedUrl)) as UniProtSearchResult
    console.log('[UniProt lookup] Reviewed response:', data)
    if (data.results?.[0]?.primaryAccession) {
      console.log('[UniProt lookup] Found Swiss-Prot:', data.results[0].primaryAccession)
      return data.results[0].primaryAccession
    }
  } catch (e) {
    console.log('[UniProt lookup] Reviewed search failed:', e)
  }

  // Try unreviewed to get gene name and organism, then search for Swiss-Prot
  const unreviewedUrl = `https://rest.uniprot.org/uniprotkb/search?query=xref:${xrefType}-${id}&fields=accession,gene_names,organism_id&size=1`
  console.log('[UniProt lookup] Trying unreviewed URL:', unreviewedUrl)
  try {
    const data = (await jsonfetch(unreviewedUrl)) as UniProtSearchResult
    console.log('[UniProt lookup] Unreviewed response:', data)
    const tremblEntry = data.results?.[0]
    if (tremblEntry) {
      const geneName = tremblEntry.genes?.[0]?.geneName?.value
      const taxonId = tremblEntry.organism?.taxonId
      console.log('[UniProt lookup] Found TrEMBL entry, gene:', geneName, 'taxon:', taxonId)

      // Try to find Swiss-Prot by gene name AND organism
      if (geneName && taxonId) {
        const swissProtUrl = `https://rest.uniprot.org/uniprotkb/search?query=gene:${geneName}+AND+organism_id:${taxonId}+AND+reviewed:true&fields=accession&size=1`
        console.log('[UniProt lookup] Trying Swiss-Prot by gene+organism:', swissProtUrl)
        try {
          const swissProtData = (await jsonfetch(swissProtUrl)) as UniProtSearchResult
          console.log('[UniProt lookup] Swiss-Prot response:', swissProtData)
          if (swissProtData.results?.[0]?.primaryAccession) {
            console.log('[UniProt lookup] Found Swiss-Prot:', swissProtData.results[0].primaryAccession)
            return swissProtData.results[0].primaryAccession
          }
        } catch (e) {
          console.log('[UniProt lookup] Swiss-Prot by gene+organism failed:', e)
        }
      }

      // Fall back to TrEMBL entry
      console.log('[UniProt lookup] Falling back to TrEMBL:', tremblEntry.primaryAccession)
      return tremblEntry.primaryAccession
    }
  } catch (e) {
    console.log('[UniProt lookup] Unreviewed search failed:', e)
  }

  console.log('[UniProt lookup] No results found')
  return undefined
}
