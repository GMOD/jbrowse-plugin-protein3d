import { getSession } from '@jbrowse/core/util'

import { JBrowsePluginProteinStructureModel } from './model'

export function proteinToGenomeMapping({
  model,
  structureSeqPos,
}: {
  structureSeqPos: number
  model: JBrowsePluginProteinStructureModel
}) {
  const {
    genomeToTranscriptSeqMapping,
    pairwiseAlignment,
    structureSeqToTranscriptSeqPosition,
  } = model
  if (!genomeToTranscriptSeqMapping || !pairwiseAlignment) {
    return undefined
  }
  const { p2g, strand } = genomeToTranscriptSeqMapping
  const r1 = structureSeqToTranscriptSeqPosition?.[structureSeqPos]
  if (r1 === undefined) {
    return undefined
  }
  const s0 = p2g[r1]
  if (s0 === undefined) {
    return undefined
  }

  const start = s0
  const end = start + 3 * strand
  return [Math.min(start, end), Math.max(start, end)] as const
}

export async function clickProteinToGenome({
  model,
  structureSeqPos,
}: {
  structureSeqPos: number
  model: JBrowsePluginProteinStructureModel
}) {
  const session = getSession(model)
  const result = proteinToGenomeMapping({ structureSeqPos, model })
  const { connectedView, genomeToTranscriptSeqMapping, zoomToBaseLevel } = model
  const { assemblyManager } = session
  if (!genomeToTranscriptSeqMapping || result === undefined) {
    return undefined
  }
  const [s1, s2] = result
  const { strand, refName } = genomeToTranscriptSeqMapping
  const assemblyName = connectedView?.assemblyNames[0]
  if (!assemblyName) {
    return undefined
  }
  model.setClickGenomeHighlights([
    {
      assemblyName,
      refName,
      start: s1,
      end: s2,
    },
  ])
  if (connectedView) {
    if (zoomToBaseLevel) {
      await connectedView.navToLocString(
        `${refName}:${s1}-${s2}${strand === -1 ? '[rev]' : ''}`,
      )
    } else {
      const assembly = assemblyManager.get(connectedView.assemblyNames[0]!)
      connectedView.centerAt(
        s1,
        assembly?.getCanonicalRefName(refName) ?? refName,
      )
    }
  }
}

export function hoverProteinToGenome({
  model,
  structureSeqPos,
}: {
  structureSeqPos?: number
  model: JBrowsePluginProteinStructureModel
}) {
  if (structureSeqPos === undefined) {
    model.setHoverGenomeHighlights([])
  } else {
    const mappedGenomeCoordinate = proteinToGenomeMapping({
      structureSeqPos,
      model,
    })
    const { genomeToTranscriptSeqMapping, connectedView } = model
    const assemblyName = connectedView?.assemblyNames[0]
    if (genomeToTranscriptSeqMapping && mappedGenomeCoordinate && assemblyName) {
      model.setHoverGenomeHighlights([
        {
          assemblyName,
          refName: genomeToTranscriptSeqMapping.refName,
          start: mappedGenomeCoordinate[0],
          end: mappedGenomeCoordinate[1],
        },
      ])
    }
  }
}
