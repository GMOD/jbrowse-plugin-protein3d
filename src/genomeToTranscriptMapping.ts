import { Feature } from '@jbrowse/core/util'

// see similar function in msaview plugin
export function genomeToTranscriptMapping(feature: Feature) {
  const strand = feature.get('strand') as number
  const refName = feature.get('refName')
  const subs = feature.children() ?? []
  const cds = subs
    .filter(f => f.get('type') === 'CDS')
    .toSorted((a, b) => strand * (a.get('start') - b.get('start')))
  const g2p = {} as Record<number, number>
  const p2g = {} as Record<number, number>

  let proteinCounter = 0
  if (strand === -1) {
    for (const f of cds) {
      for (
        let genomePos = f.get('end');
        genomePos > f.get('start');
        genomePos--
      ) {
        const proteinPos = Math.floor(proteinCounter++ / 3)
        g2p[genomePos] = proteinPos
        p2g[proteinPos] ??= genomePos
      }
    }
  } else {
    for (const f of cds) {
      for (
        let genomePos = f.get('start');
        genomePos < f.get('end');
        genomePos++
      ) {
        const proteinPos = Math.floor(proteinCounter++ / 3)
        g2p[genomePos] = proteinPos
        p2g[proteinPos] ??= genomePos
      }
    }
  }

  return {
    g2p,
    p2g,
    refName,
    strand,
  }
}
