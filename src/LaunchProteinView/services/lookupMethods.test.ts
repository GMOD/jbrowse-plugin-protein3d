import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildGeneNameQuery, searchUniProtEntries } from './lookupMethods'

function reviewedEntry(accession: string, taxon: string) {
  return {
    entryType: 'UniProtKB reviewed (Swiss-Prot)',
    primaryAccession: accession,
    organism: { taxonId: 1, scientificName: taxon },
  }
}

function stubUniProt(
  handler: (url: string) => { ok: boolean; results?: unknown[] },
) {
  const calls: string[] = []
  vi.stubGlobal('fetch', (url: string) => {
    calls.push(url)
    const { ok, results = [] } = handler(url)
    return Promise.resolve(
      new Response(JSON.stringify({ results }), { status: ok ? 200 : 500 }),
    )
  })
  return calls
}

function queryOf(url: string) {
  return decodeURIComponent(new URL(url).searchParams.get('query') ?? '')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildGeneNameQuery', () => {
  it('matches the symbol exactly rather than its synonyms', () => {
    expect(buildGeneNameQuery('Sox2', 10090)).toBe(
      'gene_exact:Sox2 AND organism_id:10090 AND reviewed:true',
    )
  })

  it('drops the organism filter when no taxon is known', () => {
    expect(buildGeneNameQuery('Sox2')).toBe('gene_exact:Sox2 AND reviewed:true')
  })
})

describe('searchUniProtEntries', () => {
  it('searches every species when the assembly names no taxon', async () => {
    const calls = stubUniProt(() => ({
      ok: true,
      results: [reviewedEntry('P48432', 'Mus musculus')],
    }))

    const { entries } = await searchUniProtEntries({ geneName: 'Sox2' })

    expect(calls).toHaveLength(1)
    expect(queryOf(calls[0]!)).toBe('gene_exact:Sox2 AND reviewed:true')
    expect(entries.map(e => e.accession)).toEqual(['P48432'])
  })

  it('scopes the query to a taxon when one is known', async () => {
    const calls = stubUniProt(() => ({ ok: true }))
    await searchUniProtEntries({ geneName: 'Sox2', organismId: 10090 })
    expect(queryOf(calls[0]!)).toContain('organism_id:10090')
  })

  it('runs the gene-name query alongside the xrefs, not after them', async () => {
    let settleXref = () => {}
    const xrefBlocked = new Promise<void>(resolve => {
      settleXref = resolve
    })
    const started: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      const query = queryOf(url)
      started.push(query)
      if (query.startsWith('xref:')) {
        await xrefBlocked
      }
      return new Response(JSON.stringify({ results: [] }), { status: 200 })
    })

    const search = searchUniProtEntries({
      recognizedIds: ['ENST00000123'],
      geneName: 'TP53',
    })
    await Promise.resolve()
    expect(started).toHaveLength(2)
    settleXref()
    await search
  })

  it('counts the sources that failed so a partial outage can be reported', async () => {
    stubUniProt(url => ({
      ok: !queryOf(url).startsWith('xref:'),
      results: [reviewedEntry('P04637', 'Homo sapiens')],
    }))

    const result = await searchUniProtEntries({
      recognizedIds: ['ENST00000123'],
      geneName: 'TP53',
    })

    expect(result.attemptedCount).toBe(2)
    expect(result.failedCount).toBe(1)
    expect(result.entries.map(e => e.accession)).toEqual(['P04637'])
  })

  it('throws when every source failed rather than reporting no entries', async () => {
    stubUniProt(() => ({ ok: false }))
    await expect(
      searchUniProtEntries({ recognizedIds: ['ENST00000123'] }),
    ).rejects.toThrow(/rest\.uniprot\.org/)
  })
})
