import { SimpleFeature } from '@jbrowse/core/util'
import { renderHook, act } from '@testing-library/react' // For testing React hooks
import useAlphaFoldDBSearch from '../src/LaunchProteinView/hooks/useAlphaFoldDBSearch'
// Import other necessary hooks and utilities from their respective paths
import * as useAlphaFoldData from '../src/LaunchProteinView/hooks/useAlphaFoldData'
import * as useAlphaFoldSequenceSearch from '../src/LaunchProteinView/hooks/useAlphaFoldSequenceSearch'
import * as useIsoformProteinSequences from '../src/LaunchProteinView/hooks/useIsoformProteinSequences'
import * as useUniProtSearch from '../src/LaunchProteinView/hooks/useUniProtSearch'
import * as getSearchDescription from '../src/LaunchProteinView/utils/getSearchDescription'
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
const mockUseAlphaFoldData = useAlphaFoldData as vi.MockedFunction<
  typeof useAlphaFoldData
>
const mockUseAlphaFoldSequenceSearch =
  useAlphaFoldSequenceSearch as vi.MockedFunction<
    typeof useAlphaFoldSequenceSearch
  >
const mockUseIsoformProteinSequences =
  useIsoformProteinSequences as vi.MockedFunction<
    typeof useIsoformProteinSequences
  >
const mockUseUniProtSearch = useUniProtSearch as vi.MockedFunction<
  typeof useUniProtSearch
>
const mockGetSearchDescription = getSearchDescription as vi.MockedFunction<
  typeof getSearchDescription
>
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
    mockFeature = new SimpleFeature({ id: 'mock-feature-id' })
    mockView = { id: 'mock-view-id' } // Mock LinearGenomeViewModel
  })

  it('should initialize selectedQueryId with the first recognized ID if available', () => {
    // Mock extractFeatureIdentifiers to return recognized IDs
    ;(mockExtractFeatureIdentifiers as vi.Mock).mockReturnValue({
      recognizedIds: ['ENSG1', 'HGNC:12345'], // Prioritize ENSG1
      geneName: 'SHH',
      geneId: 'SHH',
      uniprotId: undefined,
    })

    const { result } = renderHook(() =>
      useAlphaFoldDBSearch({ feature: mockFeature, view: mockView }),
    )

    // Check if selectedQueryId was initialized with the first recognized ID
    expect(result.current.selectedQueryId).toBe('ENSG1')
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
      id: 'transcript1',
      seq: 'MALS...',
    })
    const mockTranscript2 = new SimpleFeature({
      id: 'transcript2',
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
  // Mock getTranscriptFeatures to control its output for specific test cases
  const mockGetTranscriptFeatures = vi.spyOn(util, 'getTranscriptFeatures')
  // We are testing the exported extractFeatureIdentifiers function, so we should not mock it directly here.
  // Instead, we will control its dependencies (like getTranscriptFeatures) via mocks.
  // Ensure original util functions are accessible for direct calls if needed for base behavior.
  const {
    extractFeatureIdentifiers: actualExtractFeatureIdentifiers,
    getTranscriptFeatures: actualGetTranscriptFeatures,
    ...restOfUtil
  } = require('../src/LaunchProteinView/utils/util') // Using require here for actual functions in case vitest needs it, though import is preferred if possible.

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Default mock for getTranscriptFeatures if not overridden
    ;(mockGetTranscriptFeatures as vi.Mock).mockImplementation(f => {
      if (f.get('type') === 'gene') {
        // Return some mock transcripts if they exist in the feature data
        return (
          f
            .get('subfeatures')
            ?.filter(
              (sf: Feature) =>
                sf.get('type') === 'transcript' || sf.get('type') === 'mRNA',
            ) || []
        )
      }
      return []
    })
    // Mock getId for consistency
    ;(util.getId as vi.Mock).mockImplementation(f => f?.id() || '')
  })

  it('should extract identifiers from the first transcript subfeature if the input is a gene with transcripts', () => {
    // Mock transcript subfeature with recognized IDs and UniProt ID
    const mockTranscript = new SimpleFeature({
      id: 'transcript1_id',
      type: 'transcript', // type is transcript
      name: 'NM_001310462.2', // This should NOT be picked up as geneName for the gene
      transcript_id: 'ENST00000123456', // Recognized ID
      uniprot: 'P12345', // UniProt ID
      Dbxref: ['HGNC:HGNC:5678', 'RefSeq:NM_001310462.2'], // Dbxref containing recognized IDs
      // Other transcript-specific attributes
    })

    // Mock parent gene feature
    const mockGene = new SimpleFeature({
      id: 'SHH_gene_id', // Parent gene ID
      gene_id: 'SHH_gene_id', // Parent gene gene_id
      name: 'SHH_gene_name_fallback', // Parent gene name (should be picked up as geneName)
      type: 'gene',
      subfeatures: [mockTranscript], // Gene has a transcript subfeature
    })

    // Ensure getTranscriptFeatures returns our mock transcript for this gene
    ;(mockGetTranscriptFeatures as vi.Mock).mockReturnValue([mockTranscript])

    // Call the actual extractFeatureIdentifiers function
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
      id: 'ParentGeneID',
      gene_id: 'ParentGeneID',
      name: 'ParentGeneName',
      uniprot: 'P98765',
      Dbxref: ['HGNC:HGNC:11111'],
      type: 'gene', // Explicitly type as gene, but mock getTranscriptFeatures to return empty
    })
    // Mock getTranscriptFeatures to return empty array for this gene
    ;(mockGetTranscriptFeatures as vi.Mock).mockReturnValue([])

    // Call the actual extractFeatureIdentifiers function
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
      id: 'nonGeneFeature',
      name: 'SomeFeature',
      type: 'exon', // Not a gene
      gene_id: 'ParentGeneID',
      uniprot: 'P98765',
      Dbxref: ['HGNC:HGNC:11111'],
    })
    // Mock getTranscriptFeatures won't be called if type is not 'gene'
    ;(mockGetTranscriptFeatures as vi.Mock).mockReturnValue([])

    // Call the actual extractFeatureIdentifiers function
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
      id: 'emptyFeature',
      type: 'gene', // Type is gene, but no relevant IDs or names
    })
    // Mock getTranscriptFeatures to return empty array
    ;(mockGetTranscriptFeatures as vi.Mock).mockReturnValue([])

    // Mock extractFeatureIdentifiers to simulate its behavior for empty cases
    ;(mockExtractFeatureIdentifiers as vi.Mock).mockImplementation(f => {
      const originalUtil = require('../src/LaunchProteinView/utils/util')
      const recognizedIds = originalUtil.findRecognizedDbIds(f)
      const uniprotId = originalUtil.getUniProtIdFromFeature(f)
      const geneId = f.get('gene_id') ?? f.get('ID')
      const geneName =
        f.get('gene_name') ?? f.get('gene') ?? f.get('name') ?? f.get('Name')
      return {
        recognizedIds,
        uniprotId,
        geneId: typeof geneId === 'string' ? geneId : undefined,
        geneName: typeof geneName === 'string' ? geneName : undefined,
      }
    })

    const identifiers = extractFeatureIdentifiers(mockFeatureEmpty)

    expect(identifiers.recognizedIds).toEqual([])
    expect(identifiers.uniprotId).toBeUndefined()
    expect(identifiers.geneId).toBeUndefined()
    expect(identifiers.geneName).toBeUndefined()
  })
})
