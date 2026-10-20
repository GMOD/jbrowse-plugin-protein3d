// Pure analysis layer. Reuses the plugin's real alignment + coordinate-map code
// so the numbers shown are the numbers the plugin would actually compute, then
// derives the verdicts the plugin never surfaces to the user.

import type { EntityInfo, LoadedStructure } from './molstar'
import {
  alignTranscriptToEntity,
  alignmentQuality,
  alignmentTooLarge,
  chooseMappedEntity,
  structureSeqVsTranscriptSeqMap,
} from 'p2s_mapper'
import type { AlignmentAlgorithm } from 'p2s_mapper'

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
  /** identical residues over the shorter sequence, the score
   * chooseMappedEntity picks the entity by */
  explained: number
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

// The plugin's own alignment: stop codons stripped, the package's size cap.
function analyzeEntity(
  transcript: string,
  entity: EntityInfo,
  algorithm: AlignmentAlgorithm,
): EntityAlignment {
  const scored = alignTranscriptToEntity(transcript, entity.seq, algorithm)
  if (!scored) {
    if (alignmentTooLarge(transcript.length, entity.seqLength)) {
      throw new Error(
        `alignment too large (${transcript.length}×${entity.seqLength}); paste a shorter sequence`,
      )
    }
    return {
      entity,
      matches: 0,
      mismatches: 0,
      alignedPairs: 0,
      transcriptCoverage: 0,
      entityCoverage: 0,
      identity: 0,
      explained: 0,
    }
  }
  const q = alignmentQuality(scored.alignment)
  return {
    entity,
    matches: q.identical,
    mismatches: q.aligned - q.identical,
    alignedPairs: q.aligned,
    transcriptCoverage: q.transcriptLength ? q.aligned / q.transcriptLength : 0,
    entityCoverage: q.structureLength ? q.aligned / q.structureLength : 0,
    identity: q.identity,
    explained: scored.explained,
  }
}

/**
 * How an entity's label_seq_ids depart from a plain 1..N, or undefined when
 * they don't. This is the difference between "position + 1 is the residue id"
 * and "you must look the id up".
 */
function authorNumbering(entity: EntityInfo) {
  const { seqIds } = entity
  const from = seqIds[0]
  const to = seqIds.at(-1)
  if (from === undefined || to === undefined) {
    return undefined
  }
  const contiguousFromOne = seqIds.every((id, i) => id === i + 1)
  return contiguousFromOne
    ? undefined
    : { from, to, gapped: to - from + 1 !== seqIds.length }
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
  // The plugin's OWN entity resolution, not an assumption about it. This used
  // to be hardcoded to 0, which was faithful when the plugin hardcoded entity
  // [0] — since chooseMappedEntity landed, hardcoding it here made the harness
  // report WRONG_CHAIN for every heteromer the plugin now handles correctly.
  const usedIndex =
    chooseMappedEntity(transcript, loaded.entities, algorithm)?.index ?? 0
  let bestIndex = usedIndex
  for (const [i, a] of alignments.entries()) {
    if (
      !a.entity.nucleicAcid &&
      a.explained > alignments[bestIndex]!.explained
    ) {
      bestIndex = i
    }
  }

  const verdicts: Verdict[] = []
  const used = alignments[usedIndex]
  const best = alignments[bestIndex]

  // A regression alarm: bestIndex ranks by the same explained fraction as
  // chooseMappedEntity, so the two disagree only if entity resolution broke.
  if (best && used && bestIndex !== usedIndex) {
    verdicts.push({
      severity: 'error',
      code: 'WRONG_CHAIN',
      message: `Transcript best-matches entity [${bestIndex}] "${best.entity.description}" (${(best.identity * 100).toFixed(0)}% id, ${(best.transcriptCoverage * 100).toFixed(0)}% transcript coverage) but the plugin resolved entity [${usedIndex}] "${used.entity.description}" (${(used.identity * 100).toFixed(0)}% id, ${(used.transcriptCoverage * 100).toFixed(0)}% coverage). Every genome<->structure mapping would be wrong.`,
    })
  } else if (used && usedIndex !== 0) {
    verdicts.push({
      severity: 'ok',
      code: 'RESOLVED_CHAIN',
      message: `The protein of interest is entity [${usedIndex}] "${used.entity.description}", not entity [0] "${loaded.entities[0]!.description}". chooseMappedEntity resolved it by alignment, so the genome<->structure mapping follows the right chain — this is the case that used to map onto the wrong one.`,
    })
  }

  if (loaded.entities.length > 1) {
    verdicts.push({
      severity: 'warn',
      code: 'MULTI_ENTITY',
      message: `${loaded.entities.length} polymer entities present. Only the resolved entity [${usedIndex}] drives genome navigation; hovers and clicks on the other chains are dropped rather than mapped through the wrong alignment.`,
    })
  }

  // label_seq_id is the plugin's outbound/inbound residue address. It equals
  // (structure position + 1) only when the entity's ids run 1..N — true for any
  // mmCIF with entity_poly_seq and for PDB files carrying SEQRES, but NOT for a
  // SEQRES-less PDB, where molstar reports the author numbering instead.
  const numbering = used && authorNumbering(used.entity)
  if (numbering) {
    verdicts.push({
      severity: 'warn',
      code: 'AUTHOR_NUMBERING',
      message: `Entity [${usedIndex}] is numbered ${numbering.from}..${numbering.to}, not 1..${used.entity.seqLength}${numbering.gapped ? ' (and is non-contiguous)' : ''}. Residues are addressed by their real label_seq_id, so this maps correctly — but any code deriving the id as "position + 1" would be off by ${numbering.from - 1}.`,
    })
  }

  if (used && used.entity.observedCount < used.entity.seqLength) {
    const missing = used.entity.seqLength - used.entity.observedCount
    verdicts.push({
      severity: 'warn',
      code: 'DISORDER_DRIFT',
      message: `Entity [${usedIndex}] has ${missing} unmodeled residue(s) (${used.entity.observedCount}/${used.entity.seqLength} observed). Hovers and highlights are unaffected (they go through label_seq_id), but the confidence/B-factor track walks observed residues in model order while being indexed by sequence position, so its values drift after the first gap.`,
    })
  }

  if (used && used.identity > 0.85 && used.transcriptCoverage < 0.6) {
    verdicts.push({
      severity: 'warn',
      code: 'PARTIAL_OR_REPEAT',
      message: `Entity [${usedIndex}] aligns at ${(used.identity * 100).toFixed(0)}% identity but covers only ${(used.transcriptCoverage * 100).toFixed(0)}% of the transcript — a domain/fragment. Local alignment anchors it to a single position; for repeat-containing proteins it may anchor to the wrong copy. Verify the genomic location.`,
    })
  }

  // AlphaFold URLs are hardcoded to F1. That only loses data when the protein
  // is long enough to be fragmented (>2700 aa) — i.e. the transcript runs well
  // past what the loaded F1 structure covers.
  if (isAlphaFold && used && transcript.length > used.entity.seqLength + 50) {
    verdicts.push({
      severity: 'warn',
      code: 'AF_FRAGMENT',
      message: `Transcript is ${transcript.length} aa but the loaded AlphaFold structure only has ${used.entity.seqLength}. AlphaFold splits proteins >2700 aa into F1..Fn and the plugin hardcodes F1, so everything past ~residue ${used.entity.seqLength} is silently missing.`,
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
  const pa = alignTranscriptToEntity(
    transcript,
    entitySeq,
    'smith_waterman',
  )?.alignment
  return pa
    ? structureSeqVsTranscriptSeqMap(pa).structureSeqToTranscriptSeqPosition
    : {}
}
