import { getSession } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import { JBrowsePluginProteinViewModel } from './model'

export function proteinToGenomeMapping({
  model,
  structureSeqPos,
}: {
  structureSeqPos: number
  model: JBrowsePluginProteinViewModel
}) {
  const {
    genomeToTranscriptSeqMapping,
    alignment,
    structureSeqToTranscriptSeqPosition,
  } = model
  if (!genomeToTranscriptSeqMapping || !alignment) {
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
  return [Math.min(start, end), Math.max(start, end)]
}

export async function clickProteinToGenome({
  model,
  structureSeqPos,
}: {
  structureSeqPos: number
  model: JBrowsePluginProteinViewModel
}) {
  const session = getSession(model)
  const result = proteinToGenomeMapping({ structureSeqPos, model })
  const { genomeToTranscriptSeqMapping, zoomToBaseLevel } = model
  const { assemblyManager } = session
  if (!genomeToTranscriptSeqMapping || result === undefined) {
    return undefined
  }
  const [s1, s2] = result
  const lgv = session.views[0] as LinearGenomeViewModel
  const { strand, refName } = genomeToTranscriptSeqMapping
  model.setClickGenomeHighlights([
    {
      assemblyName: 'hg38',
      refName,
      start: s1,
      end: s2,
    },
  ])

  if (!zoomToBaseLevel) {
    const assembly = assemblyManager.get(lgv.assemblyNames[0])
    const r = assembly?.getCanonicalRefName(refName) ?? refName
    // @ts-expect-error
    lgv.centerAt(s1, r)
  } else {
    await lgv.navToLocString(
      `${refName}:${s1}-${s2}${strand === -1 ? '[rev]' : ''}`,
    )
  }
}

export function hoverProteinToGenome({
  model,
  structureSeqPos,
}: {
  structureSeqPos: number
  model: JBrowsePluginProteinViewModel
}) {
  const session = getSession(model)
  const result = proteinToGenomeMapping({ structureSeqPos, model })
  const { genomeToTranscriptSeqMapping } = model
  if (!genomeToTranscriptSeqMapping || !result) {
    return
  }
  if (!result) {
    session.notify('Genome position not found')
  }
  const [s1, s2] = result
  const { refName } = genomeToTranscriptSeqMapping
  model.setHoverGenomeHighlights([
    {
      assemblyName: 'hg38',
      refName,
      start: s1,
      end: s2,
    },
  ])
}
