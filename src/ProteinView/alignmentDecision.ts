import { isIdentical } from './alignOffThread'
import { entityAlignedTo } from './entityAlignedTo'

import type { Entity, PairwiseAlignment } from 'p2s_mapper'

/**
 * What a structure does with its alignment once its transcript and entities
 * are known. `keep` and `adopt` leave a chain pick still aligning alone, so a
 * reload of the same entities does not drop it; the others supersede it.
 * `identical` says the DP is free, so the answer need not wait on the worker.
 */
export type AlignmentDecision =
  | { kind: 'nothingToAlign' }
  | { kind: 'keep' }
  | { kind: 'adopt'; entityId: string }
  | { kind: 'discard'; problem: string }
  | {
      kind: 'realign'
      problem: string
      transcript: string
      entity: Entity
      identical: boolean
    }
  | {
      kind: 'choose'
      transcript: string
      entities: readonly Entity[]
      identical: boolean
    }

export interface AlignmentState {
  readonly userProvidedTranscriptSequence: string
  readonly entities: readonly Entity[] | undefined
  readonly pairwiseAlignment: PairwiseAlignment | undefined
  readonly alignmentImported: boolean
  readonly mappedEntityId: string | undefined
}

/**
 * An alignment computed here is kept. An imported one maps onto the chain it
 * spells; one that spells none is realigned against the stored chain when
 * that is a protein, else discarded so a chain is chosen afresh.
 *
 * Reads `state` only as far as the decision needs, so an autorun calling it
 * tracks no field a branch never looked at.
 */
export function decideAlignment(state: AlignmentState): AlignmentDecision {
  const {
    userProvidedTranscriptSequence: transcript,
    entities,
    pairwiseAlignment,
  } = state
  if (!transcript || !entities?.length) {
    return { kind: 'nothingToAlign' }
  }
  if (pairwiseAlignment) {
    if (!state.alignmentImported) {
      return { kind: 'keep' }
    }
    const { mappedEntityId } = state
    const fit = entityAlignedTo(
      pairwiseAlignment,
      transcript,
      entities,
      mappedEntityId,
    )
    if ('entityId' in fit) {
      return { kind: 'adopt', entityId: fit.entityId }
    }
    const entity = entities.find(
      e => e.entityId === mappedEntityId && !e.nucleicAcid,
    )
    return entity
      ? {
          kind: 'realign',
          problem: fit.problem,
          transcript,
          entity,
          identical: isIdentical(transcript, entity.seq),
        }
      : { kind: 'discard', problem: fit.problem }
  }
  return {
    kind: 'choose',
    transcript,
    entities,
    identical: entities.some(
      e => !e.nucleicAcid && isIdentical(transcript, e.seq),
    ),
  }
}
