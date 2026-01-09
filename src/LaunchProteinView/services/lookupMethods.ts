import { jsonfetch } from '../../fetchUtils'
import { stripTrailingVersion } from '../utils/util'

interface UniProtApiResult {
  results: {
    entryType: string
    primaryAccession: string
    uniProtkbId?: string
    genes?: {
      geneName?: {
        value: string
      }
    }[]
    organism?: {
      taxonId: number
      scientificName?: string
      commonName?: string
    }
    proteinDescription?: {
      recommendedName?: {
        fullName?: {
          value: string
        }
      }
    }
  }[]
}

export interface UniProtEntry {
  accession: string
  id?: string
  geneName?: string
  organismName?: string
  proteinName?: string
  isReviewed: boolean
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

// Ensembl gene ID prefix
function isEnsemblGeneId(id: string) {
  return /^ENSG\d+/i.test(id)
}

/**
 * Search UniProt for entries matching a gene, returning multiple results.
 * Tries multiple strategies: xref search, then gene name search.
 */
export async function searchUniProtEntries(
  geneId?: string,
  geneName?: string,
  organismId = 9606, // Default to human
): Promise<UniProtEntry[]> {
  const strippedGeneId = geneId ? stripTrailingVersion(geneId) : undefined
  const entries: UniProtEntry[] = []

  // Strategy 1: Try xref search with gene ID
  if (strippedGeneId && isEnsemblGeneId(strippedGeneId)) {
    const searchUrl = `https://rest.uniprot.org/uniprotkb/search?query=xref:ensembl-${strippedGeneId}&fields=accession,id,gene_names,organism_name,protein_name,reviewed&size=10`
    try {
      const data = (await jsonfetch(searchUrl)) as UniProtApiResult
      for (const result of data.results) {
        entries.push({
          accession: result.primaryAccession,
          id: result.uniProtkbId,
          geneName: result.genes?.[0]?.geneName?.value,
          organismName:
            result.organism?.commonName ?? result.organism?.scientificName,
          proteinName:
            result.proteinDescription?.recommendedName?.fullName?.value,
          isReviewed: result.entryType === 'UniProtKB reviewed (Swiss-Prot)',
        })
      }
    } catch {
      // xref search failed, continue to gene name search
    }
  }

  // Strategy 2: If no reviewed entries found, try gene name search
  const hasReviewedEntry = entries.some(e => e.isReviewed)
  if (!hasReviewedEntry && geneName) {
    const geneNameSearchUrl = `https://rest.uniprot.org/uniprotkb/search?query=gene:${encodeURIComponent(geneName)}+AND+organism_id:${organismId}+AND+reviewed:true&fields=accession,id,gene_names,organism_name,protein_name,reviewed&size=5`
    try {
      const data = (await jsonfetch(geneNameSearchUrl)) as UniProtApiResult
      for (const result of data.results) {
        // Don't add duplicates
        if (!entries.some(e => e.accession === result.primaryAccession)) {
          entries.push({
            accession: result.primaryAccession,
            id: result.uniProtkbId,
            geneName: result.genes?.[0]?.geneName?.value,
            organismName:
              result.organism?.commonName ?? result.organism?.scientificName,
            proteinName:
              result.proteinDescription?.recommendedName?.fullName?.value,
            isReviewed: result.entryType === 'UniProtKB reviewed (Swiss-Prot)',
          })
        }
      }
    } catch {
      // gene name search failed
    }
  }

  // Sort reviewed entries first
  entries.sort((a, b) => {
    if (a.isReviewed && !b.isReviewed) {
      return -1
    }
    if (!a.isReviewed && b.isReviewed) {
      return 1
    }
    return 0
  })

  return entries
}
