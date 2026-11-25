import {
  LOW_IDENTITY_OVER_SHORTER,
  MIN_IDENTICAL_RESIDUES,
  SHORT_ALIGNMENT_IDENTITY,
  SHORT_ALIGNMENT_RESIDUES,
  stripStopCodon,
} from 'p2s_mapper'

import type { ClassifiedIsoforms } from 'p2s_mapper'

// p2s_mapper's isLowSimilarity, on the counts a ranking keeps: it takes a whole
// AlignmentQuality, and the ranking keeps no alignment to build one from
function isLowIdentity(identical: number, shorterLength: number) {
  const floor =
    identical < SHORT_ALIGNMENT_RESIDUES
      ? SHORT_ALIGNMENT_IDENTITY
      : LOW_IDENTITY_OVER_SHORTER
  return identical < MIN_IDENTICAL_RESIDUES || identical / shorterLength < floor
}

/**
 * How far the selected isoform's protein is from the structure's, by the
 * ranking's alignment. Undefined when the two are the same protein, or when
 * there was no structure to rank against.
 */
export function isoformMatch({
  ranking,
  selectedId,
  structureSequence,
}: {
  ranking?: ClassifiedIsoforms
  selectedId?: string
  structureSequence?: string
}) {
  const ranked = ranking?.nonMatches.find(i => i.id === selectedId)
  const structureLength = structureSequence
    ? stripStopCodon(structureSequence).length
    : 0
  return ranked?.identical !== undefined && structureLength > 0
    ? {
        identical: ranked.identical,
        structureLength,
        lowIdentity: isLowIdentity(
          ranked.identical,
          Math.min(ranked.length, structureLength),
        ),
      }
    : undefined
}
