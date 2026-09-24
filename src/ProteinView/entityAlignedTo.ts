import {
  pairwiseAlignmentProblem,
  pairwiseAlignmentSequenceProblem,
  stripStopCodon,
  structureAlignedSeq,
} from 'p2s_mapper'

import type { Entity, PairwiseAlignment } from 'p2s_mapper'

/**
 * The entity whose sequence an alignment's second row spells, or why none
 * does. A saved session names its entity beside its alignment, but a spec or a
 * hand-written snapshot may not, and an alignment read against the wrong
 * chain addresses residues of another molecule — 1TUP's entity 1 is a DNA
 * strand. `preferredId` wins among several chains of one sequence, and
 * protein chains win over nucleic-acid ones.
 */
export function entityAlignedTo(
  alignment: PairwiseAlignment,
  transcript: string,
  entities: readonly Entity[],
  preferredId?: string,
): { entityId: string } | { problem: string } {
  const t = stripStopCodon(transcript)
  const shape = pairwiseAlignmentProblem(alignment)
  if (shape) {
    return { problem: shape }
  }
  const ownRow = structureAlignedSeq(alignment).replaceAll('-', '')
  const transcriptProblem = pairwiseAlignmentSequenceProblem(
    alignment,
    t,
    ownRow,
  )
  if (transcriptProblem) {
    return { problem: transcriptProblem }
  }
  const rank = (e: Entity) =>
    (e.entityId === preferredId ? 0 : 2) + (e.nucleicAcid ? 1 : 0)
  const match = [...entities]
    .sort((a, b) => rank(a) - rank(b))
    .find(
      e =>
        !pairwiseAlignmentSequenceProblem(alignment, t, stripStopCodon(e.seq)),
    )
  return match
    ? { entityId: match.entityId }
    : {
        problem: `The second sequence (${ownRow.length} residues) is not the sequence of any chain in this structure`,
      }
}
