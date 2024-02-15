import { getSession } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import { JBrowsePluginProteinViewModel } from './model'
import pairwiseSeqMap from '../pairwiseSeqMap'

export function proteinToGenomeMapping({
  model,
  pos,
}: {
  pos: number
  model: JBrowsePluginProteinViewModel
}) {
  const { genomeToTranscriptMapping, alignment } = model
  if (!genomeToTranscriptMapping || !alignment) {
    return undefined
  }
  const { p2g, strand } = genomeToTranscriptMapping
  const { structureToTranscriptPosition } = pairwiseSeqMap(alignment)
  // positions are 1-based from molstar, our data structures are 0-based
  const r1 = structureToTranscriptPosition[pos]
  // console.log({ pos, r1, structureToTranscriptPosition })
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
  pos,
}: {
  pos: number
  model: JBrowsePluginProteinViewModel
}) {
  const session = getSession(model)
  const result = proteinToGenomeMapping({ pos, model })
  const { genomeToTranscriptMapping } = model
  if (!genomeToTranscriptMapping || result === undefined) {
    return undefined
  }
  const [s1, s2] = result
  const lgv = session.views[0] as LinearGenomeViewModel
  const { strand, refName } = genomeToTranscriptMapping
  model.setClickGenomeHighlights([
    {
      assemblyName: 'hg38',
      refName,
      start: s1,
      end: s2,
    },
  ])
  await lgv.navToLocString(
    `${refName}:${s1}-${s2}${strand === -1 ? '[rev]' : ''}`,
  )
}

export function hoverProteinToGenome({
  model,
  pos,
}: {
  pos: number
  model: JBrowsePluginProteinViewModel
}) {
  const session = getSession(model)
  const result = proteinToGenomeMapping({ pos, model })
  const { genomeToTranscriptMapping } = model
  if (!genomeToTranscriptMapping || !result) {
    return
  }
  if (!result) {
    session.notify('Genome position not found')
  }
  const [s1, s2] = result
  const { refName } = genomeToTranscriptMapping
  model.setHoverGenomeHighlights([
    {
      assemblyName: 'hg38',
      refName,
      start: s1,
      end: s2,
    },
  ])
}
