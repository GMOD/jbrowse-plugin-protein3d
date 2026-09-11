import { stripStopCodon } from './util'
import { alignTranscriptToEntity } from '../../ProteinView/chooseMappedEntity'

import type { IsoformSequences } from './util'
import type { Feature } from '@jbrowse/core/util'

export interface RankedIsoform {
  feature: Feature
  length: number
  /** identical residues against the structure, for an isoform that does not
   * match it exactly; undefined with no structure to compare to */
  identical?: number
}

export interface ClassifiedIsoforms {
  // protein matches the structure residues, longest first
  matches: RankedIsoform[]
  // has a protein sequence but doesn't match the structure, best-aligning first
  nonMatches: RankedIsoform[]
  // no protein sequence could be computed
  noData: Feature[]
}

// The picker re-ranks on every render and each non-exact isoform costs an
// O(len²) alignment, so results are cached by sequence pair: a titin-sized
// isoform against a long chain is a second of main-thread work each time.
const identicalCache = new Map<string, number>()
const IDENTICAL_CACHE_LIMIT = 200

function identicalResidues(isoform: string, structure: string) {
  const key = `${isoform}\n${structure}`
  let n = identicalCache.get(key)
  if (n === undefined) {
    n =
      alignTranscriptToEntity(isoform, structure, 'smith_waterman')?.matches ??
      0
    if (identicalCache.size >= IDENTICAL_CACHE_LIMIT) {
      identicalCache.clear()
    }
    identicalCache.set(key, n)
  }
  return n
}

/**
 * The single rule for ranking transcript isoforms against a structure, shared
 * by the picker UI and the auto-selection. An isoform whose translation is the
 * structure's sequence wins outright. Among the rest, the one that aligns to
 * the structure with the most identical residues comes first, then length.
 *
 * Ranking non-matches by length alone chose the longest isoform for every
 * SEQRES that lacks Met1 or carries a tag, which is most experimental
 * entries; a shorter isoform that the structure was actually made from lost
 * to a longer one whose extra exon then aligned as a gap.
 */
export function classifyIsoforms({
  options,
  isoformSequences,
  structureSequence,
}: {
  options: Feature[]
  isoformSequences: IsoformSequences
  structureSequence?: string
}): ClassifiedIsoforms {
  const matches: RankedIsoform[] = []
  const nonMatches: RankedIsoform[] = []
  const noData: Feature[] = []
  const structure = structureSequence
    ? stripStopCodon(structureSequence)
    : undefined
  for (const feature of options) {
    const entry = isoformSequences[feature.id()]
    if (!entry) {
      noData.push(feature)
    } else if (structure && stripStopCodon(entry.seq) === structure) {
      matches.push({ feature, length: entry.seq.length })
    } else {
      nonMatches.push({
        feature,
        length: entry.seq.length,
        identical: structure
          ? identicalResidues(entry.seq, structure)
          : undefined,
      })
    }
  }
  const byLengthDesc = (a: RankedIsoform, b: RankedIsoform) =>
    b.length - a.length
  const byIdenticalThenLength = (a: RankedIsoform, b: RankedIsoform) =>
    (b.identical ?? 0) - (a.identical ?? 0) || byLengthDesc(a, b)
  return {
    matches: matches.toSorted(byLengthDesc),
    nonMatches: nonMatches.toSorted(byIdenticalThenLength),
    noData,
  }
}

export function selectBestTranscript(args: {
  options: Feature[]
  isoformSequences: IsoformSequences
  structureSequence?: string
}) {
  const { matches, nonMatches } = classifyIsoforms(args)
  return (matches[0] ?? nonMatches[0])?.feature
}
