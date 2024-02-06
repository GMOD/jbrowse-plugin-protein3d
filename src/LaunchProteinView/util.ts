import { Feature } from '@jbrowse/core/util'
import { parsePairwise } from 'clustal-js'

export interface Row {
  gene_id: string
  gene_id_version: string
  transcript_id_version: string
  transcript_id: string
  pdb_id: string
  refseq_mrna_predicted_id: string
  refseq_mrna_id: string
}

export function getTranscriptFeatures(feature: Feature) {
  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const subfeatures = feature.get('subfeatures') ?? []
  return subfeatures.some(
    f => f.get('type') === 'CDS' || f.get('type') === 'exon',
  )
    ? [feature]
    : subfeatures
}

export function stripTrailingVersion(s?: string) {
  return s?.replace(/\.[^/.]+$/, '')
}

export function z(n: number) {
  return n.toLocaleString('en-US')
}

interface Alignment {
  alns: {
    id: string
    seq: string
  }[]
}

function align(alignment: Alignment, query: number) {
  const k1 = alignment.alns[0].seq
  const k2 = alignment.alns[1].seq
  if (k1.length !== k2.length) {
    throw new Error('mismatched length')
  }

  let j = 0
  let k = 0

  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = 0; i < k1.length; i++) {
    const char1 = k1[i]
    const char2 = k2[i]
    if (char2 === '-') {
      j++
    } else if (char1 === '-') {
      k++
    } else {
      j++
      k++
    }

    if (k === query + 1) {
      return j
    }
  }
  return undefined
}

// see similar function in msaview plugin
export function generateMap({
  feature,
  alignment,
}: {
  feature: Feature
  alignment?: ReturnType<typeof parsePairwise> | undefined
}) {
  let iter = 0
  if (!alignment) {
    return []
  }
  const strand = feature.get('strand')
  const subs = feature.children() ?? []
  return subs
    .filter(f => f.get('type') === 'CDS')
    .sort((a, b) => b.get('start') - a.get('start'))
    .map(f => {
      const refName = f.get('refName').replace('chr', '')
      const featureStart = f.get('start')
      const featureEnd = f.get('end')
      const phase = f.get('phase')
      console.log({ phase })
      const len = featureEnd - featureStart + (3 - phase)
      const op = Math.floor(len / 3)
      const sourceProteinStart = iter
      const sourceProteinEnd = Math.floor(iter + op)
      const targetProteinStart = align(alignment, sourceProteinStart)
      const targetProteinEnd = align(alignment, sourceProteinEnd)
      console.log({ sourceProteinStart, sourceProteinEnd })
      iter += op
      return {
        refName,
        featureStart,
        featureEnd,
        sourceProteinStart,
        sourceProteinEnd,
        targetProteinStart,
        targetProteinEnd,
        phase,
        strand,
      } as const
    })
}

export function createMapFromData(data?: Row[]) {
  const map = new Map<string, string>()
  if (data) {
    for (const d of data) {
      const { pdb_id, transcript_id, refseq_mrna_id, transcript_id_version } = d
      if (!pdb_id) {
        continue
      }
      if (transcript_id) {
        map.set(transcript_id, pdb_id)
      }
      if (refseq_mrna_id) {
        map.set(refseq_mrna_id, pdb_id)
      }
      if (transcript_id_version) {
        map.set(transcript_id_version, pdb_id)
      }
    }
  }
  return map
}

export function getDisplayName(f: Feature): string {
  return f.get('name') || f.get('id')
}

export function getId(val?: Feature): string {
  return val === undefined ? '' : val.get('name') || val.get('id')
}

export function getTranscriptDisplayName(val?: Feature): string {
  return val === undefined
    ? ''
    : [val.get('name'), val.get('id')].filter(f => !!f).join(' ')
}

export function getGeneDisplayName(val?: Feature): string {
  return val === undefined
    ? ''
    : [val.get('gene_name') || val.get('name'), val.get('id')]
        .filter(f => !!f)
        .join(' ')
}
