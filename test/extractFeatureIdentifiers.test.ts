// @vitest-environment jsdom
import { SimpleFeature } from '@jbrowse/core/util'
import { renderHook, waitFor } from '@testing-library/react'

import * as codingFeature from '../src/LaunchProteinView/codingFeature'
import useAlphaFoldDBSearch from '../src/LaunchProteinView/hooks/useAlphaFoldDBSearch'
// Import other necessary hooks and utilities from their respective paths
import useAlphaFoldData from '../src/LaunchProteinView/hooks/useAlphaFoldData'
import useIsoformProteinSequences from '../src/LaunchProteinView/hooks/useIsoformProteinSequences'
import useUniProtIdLookup from '../src/LaunchProteinView/hooks/useUniProtIdLookup'
import useUniProtSearch from '../src/LaunchProteinView/hooks/useUniProtSearch'
import getSearchDescription from '../src/LaunchProteinView/utils/getSearchDescription'
// Import utility functions and constants directly
import * as util from '../src/LaunchProteinView/utils/util' // Import all utilities from util

// Use vi.mock for Vitest
vi.mock('../src/LaunchProteinView/hooks/useAlphaFoldData')
vi.mock('../src/LaunchProteinView/hooks/useIsoformProteinSequences')
vi.mock('../src/LaunchProteinView/hooks/useUniProtSearch')
vi.mock('../src/LaunchProteinView/utils/getSearchDescription')
// the isoform ranking runs through the session's RPC manager; here the
// registered methods run in place
vi.mock('@jbrowse/core/util', async importOriginal => {
  const actual = await importOriginal()
  const { localRpcManager } = await import('../src/test_data/localRpcManager')
  const rpcManager = localRpcManager()
  return { ...actual, getSession: () => ({ rpcManager }) }
})
vi.mock('../src/LaunchProteinView/utils/util', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    extractFeatureIdentifiers: vi.fn(), // Mock extractFeatureIdentifiers to control its output
    getId: vi.fn(f => f?.id() || ''),
  }
})
vi.mock('../src/LaunchProteinView/codingFeature', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, codingTranscripts: vi.fn() }
})

// Import the mocked functions after mocking
const mockUseAlphaFoldData = vi.mocked(useAlphaFoldData)
const mockUseIsoformProteinSequences = vi.mocked(useIsoformProteinSequences)
const mockUseUniProtSearch = vi.mocked(useUniProtSearch)
const mockGetSearchDescription = vi.mocked(getSearchDescription)
const mockExtractFeatureIdentifiers = util.extractFeatureIdentifiers as vi.Mock
const mockGetTranscriptFeatures = codingFeature.codingTranscripts as vi.Mock
const mockGetId = util.getId as vi.Mock

describe('useAlphaFoldDBSearch', () => {
  let mockFeature: SimpleFeature
  let mockView: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Setup common mocks
    mockUseAlphaFoldData.mockReturnValue({
      isLoading: false,
      isValidating: false,
      error: undefined,
      model: undefined,
      noModel: false,
    })
    mockUseIsoformProteinSequences.mockReturnValue({
      isoformSequences: {},
      isLoading: false,
      error: null,
    })
    mockUseUniProtSearch.mockReturnValue({
      entries: [],
      isLoading: false,
      error: null,
    })
    mockGetSearchDescription.mockReturnValue('mock search description')

    // Mock feature data that extractFeatureIdentifiers will process
    // This mock will be overridden in specific tests
    mockExtractFeatureIdentifiers.mockImplementation(() => ({
      recognizedIds: [],
      geneName: null,
      geneId: null,
      uniprotId: null,
    }))

    // Mocking getTranscriptFeatures to return an empty array by default
    mockGetTranscriptFeatures.mockReturnValue([])
    mockGetId.mockImplementation(f => f?.id() || '')

    // Create a mock feature and view
    mockFeature = new SimpleFeature({
      uniqueId: 'mock-feature-id',
      start: 0,
      end: 100,
      refName: 'chr1',
    })
    // assemblyNames empty so the taxon lookup short-circuits without a session
    mockView = { id: 'mock-view-id', assemblyNames: [] } // Mock LinearGenomeViewModel
  })

  // the dialog owns the lookup and hands it to every tab, so the hook under
  // test takes one rather than making its own
  function useSearchUnderTest() {
    const lookup = useUniProtIdLookup({ feature: mockFeature, view: mockView })
    return useAlphaFoldDBSearch({
      feature: mockFeature,
      view: mockView,
      lookup,
    })
  }

  it('should initialize selectedQueryId to "auto" even when recognized IDs are available', () => {
    // Mock extractFeatureIdentifiers to return recognized IDs
    mockExtractFeatureIdentifiers.mockReturnValue({
      recognizedIds: ['ENSG1', 'HGNC:12345'],
      geneName: 'SHH',
      geneId: 'SHH',
      uniprotId: undefined,
    })

    const { result } = renderHook(() => useSearchUnderTest())

    // The default is 'auto' (= query all recognized IDs); individual IDs remain
    // selectable via the IdentifierSelector but are not the initial default.
    expect(result.current.selectedQueryId).toBe('auto')
  })

  it('should initialize selectedQueryId to "auto" if no recognized IDs are available but geneName is present', () => {
    // Mock extractFeatureIdentifiers to return only geneName
    mockExtractFeatureIdentifiers.mockReturnValue({
      recognizedIds: [],
      geneName: 'SHH',
      geneId: 'SHH',
      uniprotId: undefined,
    })

    const { result } = renderHook(() => useSearchUnderTest())

    // Check if selectedQueryId was initialized to 'auto' when only geneName is available
    expect(result.current.selectedQueryId).toBe('auto')
  })

  it('should initialize selectedQueryId to "auto" if no recognized IDs or geneName are available', () => {
    // Mock extractFeatureIdentifiers to return empty
    mockExtractFeatureIdentifiers.mockReturnValue({
      recognizedIds: [],
      geneName: null,
      geneId: null,
      uniprotId: null,
    })

    const { result } = renderHook(() => useSearchUnderTest())

    // Check if selectedQueryId was initialized to 'auto' when no identifiers are found
    expect(result.current.selectedQueryId).toBe('auto')
  })

  it('selects the isoform whose protein is the structure', async () => {
    const mockTranscript1 = new SimpleFeature({
      uniqueId: 'transcript1',
      start: 0,
      end: 100,
      refName: 'chr1',
    })
    const mockTranscript2 = new SimpleFeature({
      uniqueId: 'transcript2',
      start: 0,
      end: 100,
      refName: 'chr1',
    })
    mockGetTranscriptFeatures.mockReturnValue([
      mockTranscript1,
      mockTranscript2,
    ])
    mockUseIsoformProteinSequences.mockReturnValue({
      isoformSequences: {
        transcript1: { feature: mockTranscript1, seq: 'MKTAYIAK*' },
        transcript2: { feature: mockTranscript2, seq: 'MKTAYIAKQRQISF*' },
      },
      isLoading: false,
      error: null,
    })
    mockUseAlphaFoldData.mockReturnValue({
      isLoading: false,
      isValidating: false,
      error: undefined,
      // transcript2's translation, stop codon stripped
      model: { accession: 'P1', url: 'u', sequence: 'MKTAYIAKQRQISF' },
      noModel: false,
    })

    const { result } = renderHook(() => useSearchUnderTest())

    await waitFor(() => {
      expect(result.current.userSelection).toBe('transcript2')
    })
    expect(result.current.ranking?.matches.map(m => m.id)).toEqual([
      'transcript2',
    ])
    expect(result.current.ranking?.nonMatches.map(m => m.id)).toEqual([
      'transcript1',
    ])
  })

  // Add more tests for other aspects of the hook, e.g., state updates, error handling, etc.
})

// New test file for extractFeatureIdentifiers, specifically testing the gene vs transcript prioritization.
// Note: This assumes that other helper functions like isRecognizedDatabaseId, hgncPattern, etc., are correctly exported/available from util.ts
describe('extractFeatureIdentifiers', () => {
  let actualExtractFeatureIdentifiers!: typeof util.extractFeatureIdentifiers

  let actualCodingTranscripts!: typeof codingFeature.codingTranscripts

  beforeAll(async () => {
    const actualUtil = await vi.importActual<typeof util>(
      '../src/LaunchProteinView/utils/util',
    )
    actualExtractFeatureIdentifiers = actualUtil.extractFeatureIdentifiers
    const actualCoding = await vi.importActual<typeof codingFeature>(
      '../src/LaunchProteinView/codingFeature',
    )
    actualCodingTranscripts = actualCoding.codingTranscripts
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTranscriptFeatures.mockImplementation(actualCodingTranscripts)
  })

  it('should extract identifiers from the first transcript subfeature if the input is a gene with transcripts', () => {
    // Mock transcript subfeature with recognized IDs and UniProt ID
    const mockTranscript = new SimpleFeature({
      uniqueId: 'transcript1_id',
      start: 0,
      end: 100,
      refName: 'chr1',
      type: 'transcript',
      name: 'NM_001310462.2',
      transcript_id: 'ENST00000123456',
      uniprot: 'P12345',
      Dbxref: ['HGNC:HGNC:5678', 'RefSeq:NM_001310462.2'],
      subfeatures: [
        { uniqueId: 'cds1', start: 0, end: 99, refName: 'chr1', type: 'CDS' },
      ],
    })

    const mockGene = new SimpleFeature({
      uniqueId: 'SHH_gene_id',
      start: 0,
      end: 100,
      refName: 'chr1',
      gene_id: 'SHH_gene_id',
      name: 'SHH_gene_name_fallback',
      type: 'gene',
      subfeatures: [mockTranscript],
    })

    const identifiers = actualExtractFeatureIdentifiers(mockGene)

    // Assertions:
    // recognizedIds should come from the transcript's attributes (ENST, HGNC, RefSeq)
    expect(identifiers.recognizedIds).toEqual(
      expect.arrayContaining([
        'ENST00000123456',
        'HGNC:5678',
        'NM_001310462.2',
      ]),
    )
    // UniProt ID should come from the transcript
    expect(identifiers.uniprotId).toBe('P12345')
    // Gene ID and Gene Name should come from the parent gene
    expect(identifiers.geneId).toBe('SHH_gene_id')
    expect(identifiers.geneName).toBe('SHH_gene_name_fallback')
  })

  it('should extract identifiers from the parent gene if it is not of type "gene" or has no transcripts', () => {
    const mockGeneWithoutTranscripts = new SimpleFeature({
      uniqueId: 'ParentGeneID',
      start: 0,
      end: 100,
      refName: 'chr1',
      gene_id: 'ParentGeneID',
      name: 'ParentGeneName',
      uniprot: 'P98765',
      Dbxref: ['HGNC:HGNC:11111'],
      type: 'gene',
    })
    const identifiers = actualExtractFeatureIdentifiers(
      mockGeneWithoutTranscripts,
    )

    // Assertions check the output of extractFeatureIdentifiers which uses findRecognizedDbIds internally.
    expect(identifiers.recognizedIds).toEqual(['HGNC:11111']) // From Dbxref on the parent
    expect(identifiers.uniprotId).toBe('P98765') // From uniprot attribute on the parent
    expect(identifiers.geneId).toBe('ParentGeneID')
    expect(identifiers.geneName).toBe('ParentGeneName')
  })

  it('should extract identifiers from the parent feature if it is not of type "gene"', () => {
    const mockNonGeneFeature = new SimpleFeature({
      uniqueId: 'nonGeneFeature',
      start: 0,
      end: 100,
      refName: 'chr1',
      name: 'SomeFeature',
      type: 'exon',
      gene_id: 'ParentGeneID',
      uniprot: 'P98765',
      Dbxref: ['HGNC:HGNC:11111'],
    })
    const identifiers = actualExtractFeatureIdentifiers(mockNonGeneFeature)

    expect(identifiers.recognizedIds).toEqual(['HGNC:11111'])
    expect(identifiers.uniprotId).toBe('P98765')
    expect(identifiers.geneId).toBe('ParentGeneID')
    expect(identifiers.geneName).toBe('SomeFeature') // From 'name' attribute
  })

  it('should return empty arrays/undefined if the feature is null or undefined', () => {
    expect(actualExtractFeatureIdentifiers(undefined)).toEqual({
      recognizedIds: [],
    })
    expect(actualExtractFeatureIdentifiers(null as any)).toEqual({
      recognizedIds: [],
    })
  })

  it('should handle features with no relevant attributes gracefully', () => {
    const mockFeatureEmpty = new SimpleFeature({
      uniqueId: 'emptyFeature',
      start: 0,
      end: 100,
      refName: 'chr1',
      type: 'gene',
    })
    const identifiers = actualExtractFeatureIdentifiers(mockFeatureEmpty)

    expect(identifiers.recognizedIds).toEqual([])
    expect(identifiers.uniprotId).toBeUndefined()
    expect(identifiers.geneId).toBeUndefined()
    expect(identifiers.geneName).toBeUndefined()
  })
})

// The seam between a JBrowse Feature and p2s_mapper's isoform records: the
// package ranks `{ id, seq }`, so this is the only place the conversion
// happens, and a dropped or reordered entry changes which isoform is chosen.
describe('isoform records for p2s_mapper', () => {
  let rankableIsoforms!: typeof util.rankableIsoforms

  beforeAll(async () => {
    const actualUtil = await vi.importActual<typeof util>(
      '../src/LaunchProteinView/utils/util',
    )
    rankableIsoforms = actualUtil.rankableIsoforms
  })

  const transcript = (id: string) =>
    new SimpleFeature({
      uniqueId: id,
      start: 0,
      end: 100,
      refName: 'chr1',
      type: 'mRNA',
    })

  const sequences = (entries: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(entries).map(([id, seq]) => [
        id,
        { feature: transcript(id), seq },
      ]),
    )

  it('keeps every listed transcript, in the order given', () => {
    expect(
      rankableIsoforms(
        [transcript('t3'), transcript('t1'), transcript('t2')],
        sequences({ t1: 'MAL', t2: 'MALS', t3: 'M' }),
      ),
    ).toEqual([
      { id: 't3', seq: 'M' },
      { id: 't1', seq: 'MAL' },
      { id: 't2', seq: 'MALS' },
    ])
  })

  it('leaves a transcript whose translation has not arrived without a sequence', () => {
    expect(
      rankableIsoforms([transcript('t1'), transcript('t2')], {
        ...sequences({ t1: 'MAL' }),
      }),
    ).toEqual([
      { id: 't1', seq: 'MAL' },
      { id: 't2', seq: undefined },
    ])
  })

  it('treats an empty translation as present but empty, not as absent', () => {
    expect(rankableIsoforms([transcript('t1')], sequences({ t1: '' }))).toEqual(
      [{ id: 't1', seq: '' }],
    )
  })

  it('ranks nothing when there are no transcripts and no translations', () => {
    expect(rankableIsoforms([], undefined)).toEqual([])
  })
})
