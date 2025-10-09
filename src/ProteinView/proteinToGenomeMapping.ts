import { getSession } from '@jbrowse/core/util'
import { Region } from '@jbrowse/core/util/types'

import { JBrowsePluginProteinStructureModel } from './model'

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
  const transcriptPos = structureSeqToTranscriptSeqPosition?.[structureSeqPos]

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

/**
 * Creates a genome region object for highlighting
 */
function createGenomeRegion({
  assemblyName,
  refName,
  start,
  end,
}: {
  assemblyName: string
  refName: string
  start: number
  end: number
}): Region {
  return { assemblyName, refName, start, end }
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

  const region = createGenomeRegion({ assemblyName, refName, start, end })
  model.setClickGenomeHighlights([region])
  if (connectedView) {
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

  const mappedCoords = proteinToGenomeMapping({ structureSeqPos, model })
  const { genomeToTranscriptSeqMapping, connectedView } = model
  const assemblyName = connectedView?.assemblyNames[0]

  if (genomeToTranscriptSeqMapping && mappedCoords && assemblyName) {
    const [start, end] = mappedCoords
    const region = createGenomeRegion({
      assemblyName,
      refName: genomeToTranscriptSeqMapping.refName,
      start,
      end,
    })
    model.setHoverGenomeHighlights([region])
  }
}
