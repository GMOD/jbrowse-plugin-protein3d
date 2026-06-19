// @vitest-environment jsdom
import { SimpleFeature } from '@jbrowse/core/util'
import { renderHook } from '@testing-library/react'
import useAlphaFoldDBSearch from '../src/LaunchProteinView/hooks/useAlphaFoldDBSearch'
// Import other necessary hooks and utilities from their respective paths
import useAlphaFoldData from '../src/LaunchProteinView/hooks/useAlphaFoldData'
import useAlphaFoldSequenceSearch from '../src/LaunchProteinView/hooks/useAlphaFoldSequenceSearch'
import useIsoformProteinSequences from '../src/LaunchProteinView/hooks/useIsoformProteinSequences'
import useUniProtSearch from '../src/LaunchProteinView/hooks/useUniProtSearch'
import getSearchDescription from '../src/LaunchProteinView/utils/getSearchDescription'
// Import utility functions and constants directly
import * as util from '../src/LaunchProteinView/utils/util' // Import all utilities from util

// Use vi.mock for Vitest
vi.mock('../src/LaunchProteinView/hooks/useAlphaFoldData')
vi.mock('../src/LaunchProteinView/hooks/useAlphaFoldSequenceSearch')
vi.mock('../src/LaunchProteinView/hooks/useIsoformProteinSequences')
vi.mock('../src/LaunchProteinView/hooks/useUniProtSearch')
vi.mock('../src/LaunchProteinView/utils/getSearchDescription')
vi.mock('../src/LaunchProteinView/utils/util', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    extractFeatureIdentifiers: vi.fn(), // Mock extractFeatureIdentifiers to control its output
    getTranscriptFeatures: vi.fn(),
    getId: vi.fn(f => f?.id() || ''),
    selectBestTranscript: vi.fn(), // Mock selectBestTranscript
  }
})

// Import the mocked functions after mocking
const mockUseAlphaFoldData = vi.mocked(useAlphaFoldData)
const mockUseAlphaFoldSequenceSearch = vi.mocked(useAlphaFoldSequenceSearch)
const mockUseIsoformProteinSequences = vi.mocked(useIsoformProteinSequences)
const mockUseUniProtSearch = vi.mocked(useUniProtSearch)
const mockGetSearchDescription = vi.mocked(getSearchDescription)
const mockExtractFeatureIdentifiers = util.extractFeatureIdentifiers as vi.Mock
const mockGetTranscriptFeatures = util.getTranscriptFeatures as vi.Mock
const mockGetId = util.getId as vi.Mock
const mockSelectBestTranscript = util.selectBestTranscript as vi.Mock

describe('useAlphaFoldDBSearch', () => {
  let mockFeature: SimpleFeature
  let mockView: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Setup common mocks
    mockUseAlphaFoldData.mockReturnValue({
      predictions: null,
      isLoading: false,
      error: null,
      selectedEntryIndex: 0,
      setSelectedEntryIndex: vi.fn(),
      url: null,
      confidenceUrl: null,
      structureSequence: null,
    })
    mockUseAlphaFoldSequenceSearch.mockReturnValue({
      uniprotId: null,
      cifUrl: null,
      plddtDocUrl: null,
      structureSequence: null,
      isLoading: false,
      error: null,
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
    ;(mockExtractFeatureIdentifiers as vi.Mock).mockImplementation(f => ({
      recognizedIds: [],
      geneName: null,
      geneId: null,
      uniprotId: null,
    }))

    // Mocking getTranscriptFeatures to return an empty array by default
    ;(mockGetTranscriptFeatures as vi.Mock).mockReturnValue([])
    ;(mockGetId as vi.Mock).mockImplementation(f => f?.id() || '')

    // Create a mock feature and view
    mockFeature = new SimpleFeature({
      uniqueId: 'mock-feature-id',
      start: 0,
      end: 100,
      refName: 'chr1',
    })
    mockView = { id: 'mock-view-id' } // Mock LinearGenomeViewModel
  })

  it('should initialize selectedQueryId to "auto" even when recognized IDs are available', () => {
    // Mock extractFeatureIdentifiers to return recognized IDs
    ;(mockExtractFeatureIdentifiers as vi.Mock).mockReturnValue({
      recognizedIds: ['ENSG1', 'HGNC:12345'],
      geneName: 'SHH',
      geneId: 'SHH',
      uniprotId: undefined,
    })

    const { result } = renderHook(() =>
      useAlphaFoldDBSearch({ feature: mockFeature, view: mockView }),
    )

    // The default is 'auto' (= query all recognized IDs); individual IDs remain
    // selectable via the IdentifierSelector but are not the initial default.
    expect(result.current.selectedQueryId).toBe('auto')
  })

  it('should initialize selectedQueryId to "auto" if no recognized IDs are available but geneName is present', () => {
    // Mock extractFeatureIdentifiers to return only geneName
    ;(mockExtractFeatureIdentifiers as vi.Mock).mockReturnValue({
      recognizedIds: [],
      geneName: 'SHH',
      geneId: 'SHH',
      uniprotId: undefined,
    })

    const { result } = renderHook(() =>
      useAlphaFoldDBSearch({ feature: mockFeature, view: mockView }),
    )

    // Check if selectedQueryId was initialized to 'auto' when only geneName is available
    expect(result.current.selectedQueryId).toBe('auto')
  })

  it('should initialize selectedQueryId to "auto" if no recognized IDs or geneName are available', () => {
    // Mock extractFeatureIdentifiers to return empty
    ;(mockExtractFeatureIdentifiers as vi.Mock).mockReturnValue({
      recognizedIds: [],
      geneName: null,
      geneId: null,
      uniprotId: null,
    })

    const { result } = renderHook(() =>
      useAlphaFoldDBSearch({ feature: mockFeature, view: mockView }),
    )

    // Check if selectedQueryId was initialized to 'auto' when no identifiers are found
    expect(result.current.selectedQueryId).toBe('auto')
  })

  // Test case to ensure autoTranscriptId is computed correctly directly
  it('should compute autoTranscriptId correctly directly', () => {
    const mockTranscript1 = new SimpleFeature({
      uniqueId: 'transcript1',
      start: 0,
      end: 100,
      refName: 'chr1',
      seq: 'MALS...',
    })
    const mockTranscript2 = new SimpleFeature({
      uniqueId: 'transcript2',
      start: 0,
      end: 100,
      refName: 'chr1',
      seq: 'MALS....*',
    })
    const mockTranscriptOptions = [mockTranscript1, mockTranscript2]
    const mockIsoformSequences = {
      transcript1: { feature: mockTranscript1, seq: 'MALS...' },
      transcript2: { feature: mockTranscript2, seq: 'MALS....*' },
    }
    const mockStructureSequence = 'MALS....' // Matches transcript2 after stripping stop codon

    // Mock dependencies needed for autoTranscriptId computation
    ;(mockGetTranscriptFeatures as vi.Mock).mockReturnValue(
      mockTranscriptOptions,
    )
    mockUseIsoformProteinSequences.mockReturnValue({
      isoformSequences: mockIsoformSequences,
      isLoading: false,
      error: null,
    })
    mockUseAlphaFoldData.mockReturnValue({
      structureSequence: mockStructureSequence, // This will be passed to selectBestTranscript
      // ... other properties
    })

    // Mock selectBestTranscript to return a predictable value
    const mockSelectedTranscriptId = 'transcript2'
    ;(mockSelectBestTranscript as vi.Mock).mockReturnValue({
      id: () => mockSelectedTranscriptId,
    })

    const { result } = renderHook(() =>
      useAlphaFoldDBSearch({ feature: mockFeature, view: mockView }),
    )

    // Expect autoTranscriptId to be derived from selectBestTranscript
    // selectBestTranscript should return transcript2 because its sequence matches structureSequence after stripping '*'
    // userSelection is derived from autoTranscriptId
    expect(result.current.userSelection).toBe(mockSelectedTranscriptId)

    // Verify that selectBestTranscript was called with the correct arguments
    expect(mockSelectBestTranscript).toHaveBeenCalledWith({
      options: mockTranscriptOptions,
      isoformSequences: mockIsoformSequences,
      structureSequence: mockStructureSequence,
    })
  })

  // Add more tests for other aspects of the hook, e.g., state updates, error handling, etc.
})

// New test file for extractFeatureIdentifiers, specifically testing the gene vs transcript prioritization.
// Note: This assumes that other helper functions like isRecognizedDatabaseId, hgncPattern, etc., are correctly exported/available from util.ts
describe('extractFeatureIdentifiers', () => {
  let actualExtractFeatureIdentifiers!: typeof util.extractFeatureIdentifiers

  beforeAll(async () => {
    const actualUtil = await vi.importActual<typeof util>(
      '../src/LaunchProteinView/utils/util',
    )
    actualExtractFeatureIdentifiers = actualUtil.extractFeatureIdentifiers
  })

  beforeEach(() => {
    vi.clearAllMocks()
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
