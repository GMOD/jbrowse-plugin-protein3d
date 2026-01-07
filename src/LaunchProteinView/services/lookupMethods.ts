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

export function isRecognizedTranscriptId(id: string) {
  return isEnsemblId(id) || isRefSeqId(id)
}

export async function lookupUniProtIdViaUniProt(
  geneId: string,
): Promise<string | undefined> {
  const id = stripTrailingVersion(geneId)
  if (!id) {
    return undefined
  }

  // Only perform lookups for recognized ID patterns to avoid organism ambiguity
  if (!isRecognizedTranscriptId(id)) {
    return undefined
  }

  const xrefType = isEnsemblId(id) ? 'ensembl' : 'refseq'

  // Try cross-reference search with reviewed (Swiss-Prot) first
  const reviewedUrl = `https://rest.uniprot.org/uniprotkb/search?query=xref:${xrefType}-${id}+AND+reviewed:true&fields=accession,gene_names,organism_id&size=1`
  try {
    const data = (await jsonfetch(reviewedUrl)) as UniProtSearchResult
    if (data.results[0]?.primaryAccession) {
      return data.results[0].primaryAccession
    }
  } catch {
    // Fall through to unreviewed search
  }

  // Try unreviewed to get gene name and organism, then search for Swiss-Prot
  const unreviewedUrl = `https://rest.uniprot.org/uniprotkb/search?query=xref:${xrefType}-${id}&fields=accession,gene_names,organism_id&size=1`
  try {
    const data = (await jsonfetch(unreviewedUrl)) as UniProtSearchResult
    const tremblEntry = data.results[0]
    if (tremblEntry) {
      const geneName = tremblEntry.genes?.[0]?.geneName?.value
      const taxonId = tremblEntry.organism?.taxonId

      // Try to find Swiss-Prot by gene name AND organism
      if (geneName && taxonId) {
        const swissProtUrl = `https://rest.uniprot.org/uniprotkb/search?query=gene:${geneName}+AND+organism_id:${taxonId}+AND+reviewed:true&fields=accession&size=1`
        try {
          const swissProtData = (await jsonfetch(
            swissProtUrl,
          )) as UniProtSearchResult
          if (swissProtData.results[0]?.primaryAccession) {
            return swissProtData.results[0].primaryAccession
          }
        } catch {
          // Fall through to TrEMBL fallback
        }
      }

      // Fall back to TrEMBL entry
      return tremblEntry.primaryAccession
    }
  } catch {
    // No results
  }

  return undefined
}
