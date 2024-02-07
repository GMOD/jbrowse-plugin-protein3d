import { getSession } from '@jbrowse/core/util'
import { ProteinViewModel } from '../model'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

export async function handleProteinToGenomeMapping({
  model,
  pos,
}: {
  pos: number
  model: ProteinViewModel
}) {
  const { mapping } = model
  const session = getSession(model)
  if (!mapping) {
    return
  }
  const lgv = session.views[0] as LinearGenomeViewModel
  const { p2g, strand, refName } = mapping
  const start = p2g[pos]
  if (!start) {
    throw new Error('Genome position not found')
  }
  const end = start + 3

  //   const p = (3 - phase) % 3
  //   console.log({ c, proteinStart, ret, phase, p })
  //   const fe = featureEnd - ret
  //   const fs = featureStart + ret
  //   const start = neg ? fe - p + 3 : fs - p
  //   const end = neg ? fe - p : fs + 3 - p
  //   const [s1, s2] = [Math.min(start, end), Math.max(start, end)]
  model.setHighlights([
    {
      assemblyName: 'hg38',
      refName,
      start,
      end,
    },
  ])
  await lgv.navToLocString(
    `${refName}:${start}-${end}${strand === -1 ? '[rev]' : ''}`,
  )
}
