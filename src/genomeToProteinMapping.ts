import { Feature } from '@jbrowse/core/util'

// see similar function in msaview plugin
export function genomeToProteinMapping({ feature }: { feature: Feature }) {
  const strand = feature.get('strand') as number
  const refName = feature.get('refName')
  const subs = feature.children() ?? []
  const cds = subs
    .filter(f => f.get('type') === 'CDS')
    .sort((a, b) => strand * (a.get('start') - b.get('start')))
  const g2p = {} as Record<number, number | undefined>
  const p2g = {} as Record<number, number | undefined>

  let proteinCounter = 0
  if (strand !== -1) {
    for (const f of cds) {
      const phase = f.get('phase') as number
      for (
        let genomePos = f.get('start');
        genomePos < f.get('end');
        genomePos++
      ) {
        const proteinPos = Math.floor(proteinCounter++ / 3)
        g2p[genomePos] = proteinPos
        if (!p2g[proteinPos]) {
          p2g[proteinPos] = genomePos + phase
        }
      }
    }
  } else {
    for (const f of cds) {
      const phase = f.get('phase') as number
      for (
        let genomePos = f.get('end');
        genomePos > f.get('start');
        genomePos--
      ) {
        const proteinPos = Math.floor(proteinCounter++ / 3)
        g2p[genomePos] = proteinPos
        if (!p2g[proteinPos]) {
          p2g[proteinPos] = genomePos + phase
        }
      }
    }
  }
  return { g2p, p2g, refName, strand }
}
