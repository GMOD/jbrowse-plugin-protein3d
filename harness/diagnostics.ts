// Pure analysis layer. Reuses the plugin's real alignment + coordinate-map code
// so the numbers shown are the numbers the plugin would actually compute, then
// derives the verdicts the plugin never surfaces to the user.
import { structureSeqVsTranscriptSeqMap } from '../src/mappings'
import { runLocalAlignment } from '../src/ProteinView/pairwiseAlignment'

import type { EntityInfo, LoadedStructure } from './molstar'
import type { AlignmentAlgorithm } from '../src/ProteinView/types'

export interface EntityAlignment {
  entity: EntityInfo
  matches: number
  mismatches: number
  alignedPairs: number
  /** fraction of the transcript that maps onto this entity */
  transcriptCoverage: number
  /** fraction of this entity that maps onto the transcript */
  entityCoverage: number
  /** identity over aligned (non-gap) columns */
  identity: number
}

export type Severity = 'error' | 'warn' | 'ok'

export interface Verdict {
  severity: Severity
  code: string
  message: string
}

export interface Diagnosis {
  alignments: EntityAlignment[]
  usedIndex: number
  bestIndex: number
  verdicts: Verdict[]
}

function analyzeEntity(
  transcript: string,
  entity: EntityInfo,
  algorithm: AlignmentAlgorithm,
): EntityAlignment {
  const pa = runLocalAlignment(transcript, entity.seq, algorithm)
  const a = pa.alns[0].seq
  const b = pa.alns[1].seq
  let matches = 0
  let mismatches = 0
  for (let i = 0; i < a.length; i++) {
    const ca = a[i]!
    const cb = b[i]!
    if (ca !== '-' && cb !== '-') {
      if (ca.toUpperCase() === cb.toUpperCase()) {
        matches++
      } else {
        mismatches++
      }
    }
  }
  const alignedPairs = matches + mismatches
  return {
    entity,
    matches,
    mismatches,
    alignedPairs,
    transcriptCoverage: transcript.length ? alignedPairs / transcript.length : 0,
    entityCoverage: entity.seqLength ? alignedPairs / entity.seqLength : 0,
    identity: alignedPairs ? matches / alignedPairs : 0,
  }
}

export function diagnose({
  loaded,
  transcript,
  algorithm,
  isAlphaFold,
}: {
  loaded: LoadedStructure
  transcript: string
  algorithm: AlignmentAlgorithm
  isAlphaFold: boolean
}): Diagnosis {
  const alignments = loaded.entities.map(e =>
    analyzeEntity(transcript, e, algorithm),
  )
  const usedIndex = 0
  let bestIndex = 0
  for (let i = 1; i < alignments.length; i++) {
    if (alignments[i]!.matches > alignments[bestIndex]!.matches) {
      bestIndex = i
    }
  }

  const verdicts: Verdict[] = []
  const used = alignments[usedIndex]
  const best = alignments[bestIndex]

  if (loaded.entities.length > 1) {
    verdicts.push({
      severity: bestIndex === usedIndex ? 'warn' : 'error',
      code: 'MULTI_ENTITY',
      message: `${loaded.entities.length} polymer entities present. The plugin only ever maps entity [0] (${loaded.entities[0]!.description}); hovers on other chains are read with their own label_seq_id but mapped through entity [0]'s alignment.`,
    })
  }

  if (best && used && bestIndex !== usedIndex) {
    verdicts.push({
      severity: 'error',
      code: 'WRONG_CHAIN',
      message: `Transcript best-matches entity [${bestIndex}] "${best.entity.description}" (${(best.identity * 100).toFixed(0)}% id, ${(best.transcriptCoverage * 100).toFixed(0)}% transcript coverage) but the plugin uses entity [0] "${used.entity.description}" (${(used.identity * 100).toFixed(0)}% id, ${(used.transcriptCoverage * 100).toFixed(0)}% coverage). Every genome<->structure mapping would be wrong.`,
    })
  }

  if (used && used.entity.observedCount < used.entity.seqLength) {
    const missing = used.entity.seqLength - used.entity.observedCount
    verdicts.push({
      severity: 'warn',
      code: 'DISORDER_DRIFT',
      message: `Entity [0] has ${missing} unmodeled residue(s) (${used.entity.observedCount}/${used.entity.seqLength} observed). The confidence/B-factor track walks observed residues in order but is indexed by label_seq_id, so values drift after the first gap.`,
    })
  }

  if (used && used.identity > 0.85 && used.transcriptCoverage < 0.6) {
    verdicts.push({
      severity: 'warn',
      code: 'PARTIAL_OR_REPEAT',
      message: `Entity [0] aligns at ${(used.identity * 100).toFixed(0)}% identity but covers only ${(used.transcriptCoverage * 100).toFixed(0)}% of the transcript — a domain/fragment. Local alignment anchors it to a single position; for repeat-containing proteins it may anchor to the wrong copy. Verify the genomic location.`,
    })
  }

  if (isAlphaFold) {
    verdicts.push({
      severity: 'warn',
      code: 'AF_FRAGMENT',
      message: `AlphaFold URLs are hardcoded to fragment F1. Proteins >2700 aa are split into F1..Fn with offset numbering, so only the first ~1400 residues are ever loaded.`,
    })
  }

  if (verdicts.length === 0) {
    verdicts.push({
      severity: 'ok',
      code: 'CLEAN',
      message: `Single entity, fully modeled, transcript maps cleanly onto entity [0]. This is the AlphaFold-style happy path.`,
    })
  }

  return { alignments, usedIndex, bestIndex, verdicts }
}

/** Sample of the actual coordinate map the plugin builds for entity [0], to make
 * the structure->transcript correspondence concrete. */
export function sampleCoordinateMap(transcript: string, entitySeq: string) {
  const pa = runLocalAlignment(transcript, entitySeq, 'smith_waterman')
  const { structureSeqToTranscriptSeqPosition } =
    structureSeqVsTranscriptSeqMap(pa)
  return structureSeqToTranscriptSeqPosition
}
