import { getGeneticCode } from '@jbrowse/core/util/geneticCodes'
import { genomeToTranscriptSeqMapping } from 'g2p_mapper'
import { expect, test } from 'vitest'

import { parseLaunchVariant, placeLaunchVariant } from './launchVariant'

const { codonTable } = getGeneticCode(1)

test('reads a 1-based position and forward-strand bases', () => {
  expect(parseLaunchVariant('chr17:7674220 C>T')).toEqual({
    text: 'chr17:7674220 C>T',
    refName: 'chr17',
    start: 7674219,
    change: { ref: 'C', alt: 'T' },
  })
  expect(parseLaunchVariant(' 17:7,674,220c>t ')).toEqual({
    text: '17:7,674,220c>t',
    refName: '17',
    start: 7674219,
    change: { ref: 'C', alt: 'T' },
  })
})

test('a position alone names the residue without a change', () => {
  expect(parseLaunchVariant('chr17:7674220')).toEqual({
    text: 'chr17:7674220',
    refName: 'chr17',
    start: 7674219,
    change: undefined,
  })
})

test('refuses what is not one base or one substitution', () => {
  for (const text of [
    'R248Q',
    'chr17',
    'chr17:0',
    'chr17:7674220 C>C',
    'chr17:7674220 CA>T',
    'chr17:7674220-7674221',
    'chr17:7674220 C>N',
  ]) {
    expect(parseLaunchVariant(text)).toBeUndefined()
  }
})

// The minus-strand transcript of clinVar.test.ts: two coding exons, [20,25)
// then [7,14), reading ATG GAA TGC TAA (M E C *). The second codon is split
// by the intron, G and A at 21 and 20 and its last A at 13.
const MINUS_GENOME = 'NNNNNNNTTAGCATNNNNNNTCCATNNNNN'
const minus = genomeToTranscriptSeqMapping({
  refName: 'chr17',
  start: 7,
  end: 25,
  strand: -1,
  subfeatures: [
    { refName: 'chr17', start: 20, end: 25, type: 'CDS', phase: 0 },
    { refName: 'chr17', start: 7, end: 14, type: 'CDS', phase: 0 },
  ],
})

// ATG GCC TAA, M A *
const PLUS_GENOME = 'ATGGCCTAA'
const plus = genomeToTranscriptSeqMapping({
  refName: 'chr1',
  start: 0,
  end: 9,
  strand: 1,
  subfeatures: [{ refName: 'chr1', start: 0, end: 9, type: 'CDS', phase: 0 }],
})

function place(
  text: string,
  {
    mapping = minus,
    genome = MINUS_GENOME,
    onTranscriptChromosome = true,
  } = {},
) {
  const variant = parseLaunchVariant(text)
  if (!variant) {
    throw new Error(`${text} did not parse`)
  }
  return placeLaunchVariant({
    variant,
    mapping,
    onTranscriptChromosome,
    genomeBase: position => genome[position],
    codonTable,
    transcriptName: 'TX1',
  })
}

test('names a plus-strand missense change by its residue', () => {
  expect(place('chr1:5 C>A', { mapping: plus, genome: PLUS_GENOME })).toEqual({
    transcriptResidue: 2,
    label: 'A2D',
  })
})

test('reads a minus-strand change in the transcript’s own bases', () => {
  // forward C>T is G>A on the transcript: GAA to AAA, lysine
  expect(place('chr17:22 C>T')).toEqual({ transcriptResidue: 2, label: 'E2K' })
})

test('places a change on the far side of the intron on its split codon', () => {
  // the codon's last base, at 13: GAA to GAC, aspartate
  expect(place('chr17:14 T>G')).toEqual({ transcriptResidue: 2, label: 'E2D' })
})

test('labels a synonymous change with = and a nonsense one with *', () => {
  // GAA to GAG, still glutamate
  expect(place('chr17:14 T>C').label).toBe('E2=')
  // TGC to TGA, a stop
  expect(place('chr17:11 G>T').label).toBe('C3*')
})

test('a position alone names the residue it sits in', () => {
  expect(place('chr17:22')).toEqual({ transcriptResidue: 2, label: 'E2' })
})

test('refuses a reference base the genome does not have', () => {
  expect(() => place('chr17:22 G>A')).toThrow(
    '`variant` chr17:22 G>A names G as the reference base, and the genome has C there',
  )
})

test('refuses a base outside the coding sequence', () => {
  expect(() => place('chr17:17')).toThrow(
    '`variant` chr17:17 is not in the coding sequence of TX1',
  )
  expect(() => place('chr17:30')).toThrow('not in the coding sequence')
})

test('refuses a base in the stop codon', () => {
  expect(() => place('chr17:9 A>G')).toThrow(
    '`variant` chr17:9 A>G is in the stop codon of TX1',
  )
})

test('refuses a base on another chromosome at a coding number', () => {
  expect(() => place('chr2:22 C>T', { onTranscriptChromosome: false })).toThrow(
    'not in the coding sequence of TX1',
  )
})
