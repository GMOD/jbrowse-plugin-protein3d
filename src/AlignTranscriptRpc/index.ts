import { RpcMethodType } from '@jbrowse/core/pluggableElementTypes'
import { alignTranscriptToEntity, chooseMappedEntity } from 'p2s_mapper'

import type PluginManager from '@jbrowse/core/PluginManager'
import type {
  AlignmentAlgorithm,
  EntityCandidate,
  EntitySelection,
  ScoredAlignment,
} from 'p2s_mapper'

interface ChooseArgs {
  transcript: string
  entities: EntityCandidate[]
  algorithm: AlignmentAlgorithm
}

interface AlignArgs {
  transcript: string
  entitySeq: string
  algorithm: AlignmentAlgorithm
}

declare module '@jbrowse/core/rpc/RpcRegistry' {
  interface RpcRegistry {
    ProteinChooseMappedEntity: {
      args: ChooseArgs
      return: EntitySelection | undefined
    }
    ProteinAlignTranscriptToEntity: {
      args: AlignArgs
      return: ScoredAlignment | undefined
    }
  }
}

// The alignment DP runs ~50 ns a cell, so a 4,000-residue transcript against
// its structure is almost a second and a complex of long chains several: on
// the main thread, frozen UI. These run it in the host's RPC worker instead,
// or in place on a host whose driver is MainThreadRpcDriver.
export class ProteinChooseMappedEntity extends RpcMethodType<'ProteinChooseMappedEntity'> {
  name = 'ProteinChooseMappedEntity' as const

  async execute({ transcript, entities, algorithm }: ChooseArgs) {
    return chooseMappedEntity(transcript, entities, algorithm)
  }
}

export class ProteinAlignTranscriptToEntity extends RpcMethodType<'ProteinAlignTranscriptToEntity'> {
  name = 'ProteinAlignTranscriptToEntity' as const

  async execute({ transcript, entitySeq, algorithm }: AlignArgs) {
    return alignTranscriptToEntity(transcript, entitySeq, algorithm)
  }
}

export default function AlignTranscriptRpcF(pluginManager: PluginManager) {
  pluginManager.addRpcMethod(pm => new ProteinChooseMappedEntity(pm))
  pluginManager.addRpcMethod(pm => new ProteinAlignTranscriptToEntity(pm))
}
