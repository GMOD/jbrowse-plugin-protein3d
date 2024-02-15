import { Feature } from '@jbrowse/core/util'

export interface Alignment {
  alns: {
    id: string
    seq: string
  }[]
}

export function structureSeqVsTranscriptSeqMap(alignment: Alignment) {
  const structureSeq = alignment.alns[0].seq
  const transcriptSeq = alignment.alns[1].seq
  if (structureSeq.length !== transcriptSeq.length) {
    throw new Error('mismatched length')
  }

  let j = 0
  let k = 0
  const structureSeqToTranscriptSeqPosition = {} as Record<
    string,
    number | undefined
  >
  const transcriptSeqToStructureSeqPositon = {} as Record<
    string,
    number | undefined
  >

  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = 0; i < structureSeq.length; i++) {
    const c1 = structureSeq[i]
    const c2 = transcriptSeq[i]

    if (c1 === c2) {
      structureSeqToTranscriptSeqPosition[j] = k
      transcriptSeqToStructureSeqPositon[k] = j
      k++
      j++
    } else if (c2 === '-') {
      j++
    } else if (c1 === '-') {
      k++
    } else {
      structureSeqToTranscriptSeqPosition[j] = k
      transcriptSeqToStructureSeqPositon[k] = j

      k++
      j++
    }
  }
  return {
    structureSeqToTranscriptSeqPosition,
    transcriptSeqToStructureSeqPositon,
  }
}

export function structurePositionToAlignmentMap(alignment: Alignment) {
  const structureSeq = alignment.alns[0].seq
  const structurePositionToAlignment = {} as Record<string, number | undefined>

  for (let i = 0, j = 0; i < structureSeq.length; i++) {
    if (structureSeq[i] !== '-') {
      structurePositionToAlignment[j] = i
      j++
    }
  }

  return structurePositionToAlignment
}

export function transcriptPositionToAlignmentMap(alignment: Alignment) {
  const transcriptSeq = alignment.alns[1].seq
  const transcriptPositionToAlignment = {} as Record<string, number | undefined>

  for (let i = 0, j = 0; i < transcriptSeq.length; i++) {
    if (transcriptSeq[i] !== '-') {
      transcriptPositionToAlignment[j] = i
      j++
    }
  }

  return transcriptPositionToAlignment
}

// see similar function in msaview plugin
export function genomeToTranscriptSeqMapping(feature: Feature) {
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
      for (
        let genomePos = f.get('start');
        genomePos < f.get('end');
        genomePos++
      ) {
        const proteinPos = Math.floor(proteinCounter++ / 3)
        g2p[genomePos] = proteinPos
        if (!p2g[proteinPos]) {
          p2g[proteinPos] = genomePos
        }
      }
    }
  } else {
    for (const f of cds) {
      for (
        let genomePos = f.get('end');
        genomePos > f.get('start');
        genomePos--
      ) {
        const proteinPos = Math.floor(proteinCounter++ / 3)
        g2p[genomePos] = proteinPos
        if (!p2g[proteinPos]) {
          p2g[proteinPos] = genomePos
        }
      }
    }
  }

  return { g2p, p2g, refName, strand }
}
