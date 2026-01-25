import { jsonfetch } from '../../fetchUtils'
import {
  getDatabaseTypeForId,
  isRecognizedDatabaseId,
  stripTrailingVersion,
} from '../utils/util'

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

// Re-export for backward compatibility
export { isRecognizedDatabaseId as isRecognizedTranscriptId }

/**
 * Build UniProt xref query for a recognized database ID
 */
function buildXrefQuery(id: string): string | undefined {
  const dbType = getDatabaseTypeForId(id)
  if (!dbType) {
    return undefined
  }

  switch (dbType) {
    case 'ensembl':
      return `xref:ensembl-${id}`
    case 'refseq':
      return `xref:refseq-${id}`
    case 'ccds':
      return `xref:ccds-${id}`
    case 'hgnc':
      // HGNC format in UniProt is just the number
      return `xref:hgnc-${id.replace('HGNC:', '')}`
    default:
      return undefined
  }
}

/**
 * Search UniProt using a specific xref query
 */
async function searchByXref(query: string): Promise<UniProtEntry[]> {
  const searchUrl = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&fields=accession,id,gene_names,organism_name,protein_name,reviewed&size=10`
  const data = (await jsonfetch(searchUrl)) as UniProtApiResult
  return data.results.map(result => ({
    accession: result.primaryAccession,
    id: result.uniProtkbId,
    geneName: result.genes?.[0]?.geneName?.value,
    organismName:
      result.organism?.commonName ?? result.organism?.scientificName,
    proteinName: result.proteinDescription?.recommendedName?.fullName?.value,
    isReviewed: result.entryType === 'UniProtKB reviewed (Swiss-Prot)',
  }))
}

/**
 * Search UniProt for entries matching a gene, returning multiple results.
 * Tries multiple strategies in order of specificity:
 * 1. Recognized database IDs (Ensembl, RefSeq, CCDS, HGNC) via xref search
 * 2. Gene name search
 */
export async function searchUniProtEntries({
  recognizedIds = [],
  geneId,
  geneName,
  organismId = 9606,
}: {
  recognizedIds?: string[]
  geneId?: string
  geneName?: string
  organismId?: number
}): Promise<UniProtEntry[]> {
  const entries: UniProtEntry[] = []
  const seenAccessions = new Set<string>()

  const addEntries = (newEntries: UniProtEntry[]) => {
    for (const entry of newEntries) {
      if (!seenAccessions.has(entry.accession)) {
        seenAccessions.add(entry.accession)
        entries.push(entry)
      }
    }
  }

  // Strategy 1: Search by recognized database IDs (most specific)
  for (const id of recognizedIds) {
    const query = buildXrefQuery(id)
    if (query) {
      try {
        const results = await searchByXref(query)
        addEntries(results)
        // If we found reviewed entries with a specific ID, that's likely correct
        if (results.some(e => e.isReviewed)) {
          break
        }
      } catch {
        // xref search failed, continue to next ID
      }
    }
  }

  // Strategy 2: Try legacy gene_id if it looks like an Ensembl gene ID
  const strippedGeneId = geneId ? stripTrailingVersion(geneId) : undefined
  if (
    strippedGeneId &&
    isRecognizedDatabaseId(strippedGeneId) &&
    !recognizedIds.includes(strippedGeneId)
  ) {
    const query = buildXrefQuery(strippedGeneId)
    if (query) {
      try {
        addEntries(await searchByXref(query))
      } catch {
        // xref search failed
      }
    }
  }

  // Strategy 3: If no reviewed entries found, try gene name search
  const hasReviewedEntry = entries.some(e => e.isReviewed)
  if (!hasReviewedEntry && geneName) {
    const geneNameSearchUrl = `https://rest.uniprot.org/uniprotkb/search?query=gene:${encodeURIComponent(geneName)}+AND+organism_id:${organismId}+AND+reviewed:true&fields=accession,id,gene_names,organism_name,protein_name,reviewed&size=5`
    try {
      const data = (await jsonfetch(geneNameSearchUrl)) as UniProtApiResult
      addEntries(
        data.results.map(result => ({
          accession: result.primaryAccession,
          id: result.uniProtkbId,
          geneName: result.genes?.[0]?.geneName?.value,
          organismName:
            result.organism?.commonName ?? result.organism?.scientificName,
          proteinName:
            result.proteinDescription?.recommendedName?.fullName?.value,
          isReviewed: result.entryType === 'UniProtKB reviewed (Swiss-Prot)',
        })),
      )
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
