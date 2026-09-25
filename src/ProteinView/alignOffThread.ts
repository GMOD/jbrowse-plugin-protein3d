import { stripStopCodon } from 'p2s_mapper'

import type RpcManager from '@jbrowse/core/rpc/RpcManager'
import type { RpcCallArgs } from '@jbrowse/core/rpc/RpcRegistry'

export type AlignmentMethod =
  'ProteinChooseMappedEntity' | 'ProteinAlignTranscriptToEntity'

const ALIGNMENT_RPC_SESSION = 'protein3d-alignment'

export function alignOffThread<M extends AlignmentMethod>(
  rpcManager: Pick<RpcManager, 'call'>,
  name: M,
  args: RpcCallArgs<M>,
) {
  // v4 hosts read sessionId from the args as well as the call
  return rpcManager.call(ALIGNMENT_RPC_SESSION, name, {
    ...args,
    sessionId: ALIGNMENT_RPC_SESSION,
  })
}

/**
 * Whether the alignment is free: p2s_mapper skips the DP for an identical
 * sequence, so there is nothing to send to the worker, and the answer does not
 * wait behind the track renders queued there at launch.
 */
export function isIdentical(transcript: string, seq: string) {
  const t = stripStopCodon(transcript)
  return t.length > 0 && t === stripStopCodon(seq)
}
