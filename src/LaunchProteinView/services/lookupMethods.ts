import { jsonfetch } from '../../fetchUtils'
import {
  buildUniProtXrefQuery,
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

const UNIPROT_FIELDS =
  'accession,id,gene_names,organism_name,protein_name,reviewed'

function mapApiResultToEntry(
  result: UniProtApiResult['results'][0],
): UniProtEntry {
  return {
    accession: result.primaryAccession,
    id: result.uniProtkbId,
    geneName: result.genes?.[0]?.geneName?.value,
    organismName:
      result.organism?.commonName ?? result.organism?.scientificName,
    proteinName: result.proteinDescription?.recommendedName?.fullName?.value,
    isReviewed: result.entryType === 'UniProtKB reviewed (Swiss-Prot)',
  }
}

async function searchUniProt(
  query: string,
  size = 10,
): Promise<UniProtEntry[]> {
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&fields=${UNIPROT_FIELDS}&size=${size}`
  const data = await jsonfetch<UniProtApiResult>(url)
  return data.results.map(mapApiResultToEntry)
}

/**
 * `gene_exact` rather than `gene`, which also matches synonyms and returns
 * paralogs. Without a taxon the query runs across every species, so a mouse
 * assembly whose tracks carry no taxId lists mouse beside human instead of
 * silently answering with the human entry.
 *
 * The symbol is quoted because a bare one containing `:` — an HLA allele, a
 * name straight out of an annotation file — reads as another field to
 * UniProt's parser, which answers 400.
 */
export function buildGeneNameQuery(geneName: string, organismId?: number) {
  return [
    `gene_exact:"${geneName.replaceAll('"', '\\"')}"`,
    organismId ? `organism_id:${organismId}` : undefined,
    'reviewed:true',
  ]
    .filter(s => s !== undefined)
    .join(' AND ')
}

interface SearchAttempt {
  entries: UniProtEntry[]
  error: unknown
}

async function searchByXref(id: string): Promise<SearchAttempt> {
  const query = buildUniProtXrefQuery(id)
  if (!query) {
    return { entries: [], error: undefined }
  }
  try {
    return { entries: await searchUniProt(query), error: undefined }
  } catch (e) {
    console.error(`xref search failed for ${id}:`, e)
    return { entries: [], error: e }
  }
}

async function searchByGeneName(
  geneName: string,
  organismId?: number,
): Promise<SearchAttempt> {
  try {
    const entries = await searchUniProt(
      buildGeneNameQuery(geneName, organismId),
      organismId ? 5 : 10,
    )
    return { entries, error: undefined }
  } catch (e) {
    console.error(`gene name search failed for ${geneName}:`, e)
    return { entries: [], error: e }
  }
}

function deduplicateEntries(entries: UniProtEntry[]) {
  const seen = new Set<string>()
  const result: UniProtEntry[] = []
  for (const entry of entries) {
    if (!seen.has(entry.accession)) {
      seen.add(entry.accession)
      result.push(entry)
    }
  }
  return result
}

export interface UniProtSearchResult {
  entries: UniProtEntry[]
  attemptedCount: number
  failedCount: number
}

export async function searchUniProtEntries({
  recognizedIds = [],
  geneId,
  geneName,
  organismId,
}: {
  recognizedIds?: string[]
  geneId?: string
  geneName?: string
  /** NCBI taxon id; undefined searches every species */
  organismId?: number
}): Promise<UniProtSearchResult> {
  const idsToSearch = new Set(recognizedIds)
  const strippedGeneId = geneId ? stripTrailingVersion(geneId) : undefined
  if (strippedGeneId && isRecognizedDatabaseId(strippedGeneId)) {
    idsToSearch.add(strippedGeneId)
  }

  // The gene-name query runs alongside the xrefs rather than after them: it is
  // only consulted when no xref found a reviewed entry, but waiting for that
  // answer before starting it doubled the latency of the commonest case.
  const [xrefResults, geneResult] = await Promise.all([
    Promise.all([...idsToSearch].map(searchByXref)),
    geneName ? searchByGeneName(geneName, organismId) : undefined,
  ])

  let entries = deduplicateEntries(xrefResults.flatMap(r => r.entries))
  // The gene-name answer is consulted only where no xref found a reviewed
  // entry. Counting it otherwise reported "failed for 1 of 2 identifiers" over
  // a gene that had in fact resolved, off a query nothing was waiting for.
  const consultedGeneResult =
    geneResult && !entries.some(e => e.isReviewed) ? geneResult : undefined
  if (consultedGeneResult) {
    entries = deduplicateEntries([...entries, ...consultedGeneResult.entries])
  }

  const attemptedCount = idsToSearch.size + (consultedGeneResult ? 1 : 0)
  const failedCount =
    xrefResults.filter(r => r.error !== undefined).length +
    (consultedGeneResult?.error === undefined ? 0 : 1)

  // Every attempt failing is a network problem, not an empty result. Throwing
  // it stops consumers reporting "No UniProt ID found" over a dead connection.
  if (
    entries.length === 0 &&
    attemptedCount > 0 &&
    attemptedCount === failedCount
  ) {
    throw (
      consultedGeneResult?.error ??
      xrefResults.find(r => r.error !== undefined)?.error
    )
  }

  return {
    entries: entries.toSorted(
      (a, b) => Number(b.isReviewed) - Number(a.isReviewed),
    ),
    attemptedCount,
    failedCount,
  }
}
