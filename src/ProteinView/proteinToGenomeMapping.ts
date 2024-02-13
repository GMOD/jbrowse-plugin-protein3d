import { getSession } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import { JBrowsePluginProteinViewModel } from './model'
import pairwiseSeqMap from '../pairwiseSeqMap'

export async function proteinToGenomeMapping({
  model,
  pos,
}: {
  pos: number
  model: JBrowsePluginProteinViewModel
}) {
  const { transcriptToProteinMap, alignment } = model
  const session = getSession(model)
  if (!transcriptToProteinMap || !alignment) {
    return
  }
  const lgv = session.views[0] as LinearGenomeViewModel
  const { p2g, strand, refName } = transcriptToProteinMap
  const { coord1 } = pairwiseSeqMap(alignment)
  // positions are 1-based from molstar, our data structures are 0-based
  const r1 = coord1[pos - 1]
  if (r1 === undefined) {
    session.notify('Pairwise seq map failed to resolve')
    return
  }
  const s0 = p2g[r1]
  if (s0 === undefined) {
    session.notify('Genome position not found')
    return
  }
  const start = s0
  const end = start + 3 * strand
  const [s1, s2] = [Math.min(start, end), Math.max(start, end)]

  model.setHighlights([
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
