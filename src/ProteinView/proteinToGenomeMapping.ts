import { getSession } from '@jbrowse/core/util'

import type { JBrowsePluginProteinStructureModel } from './model'

/**
 * Maps a protein structure position to genome coordinates
 * @returns [start, end] tuple of genome coordinates, or undefined if mapping fails
 */
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
  const transcriptPos =
    structureSeqToTranscriptSeqPosition?.[structureSeqPos + 1]

  if (transcriptPos === undefined) {
    return undefined
  }

  const genomePos = p2g[transcriptPos]
  if (genomePos === undefined) {
    return undefined
  }

  // Calculate codon range (3 bases per amino acid)
  const start = genomePos
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
  const [start, end] = result
  const { strand, refName } = genomeToTranscriptSeqMapping
  const assemblyName = connectedView?.assemblyNames[0]
  if (!assemblyName) {
    return undefined
  }

  model.setClickGenomeHighlights([
    {
      assemblyName,
      refName,
      start,
      end,
    },
  ])
  if (zoomToBaseLevel) {
    await connectedView.navToLocString(
      `${refName}:${start}-${end}${strand === -1 ? '[rev]' : ''}`,
    )
  } else {
    const assembly = assemblyManager.get(connectedView.assemblyNames[0]!)
    connectedView.centerAt(
      start,
      assembly?.getCanonicalRefName(refName) ?? refName,
    )
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
    return
  }

  const mappedCoords = proteinToGenomeMapping({
    structureSeqPos,
    model,
  })
  const { genomeToTranscriptSeqMapping, connectedView } = model
  const assemblyName = connectedView?.assemblyNames[0]

  if (genomeToTranscriptSeqMapping && mappedCoords && assemblyName) {
    const [start, end] = mappedCoords
    model.setHoverGenomeHighlights([
      {
        assemblyName,
        refName: genomeToTranscriptSeqMapping.refName,
        start,
        end,
      },
    ])
  }
}
