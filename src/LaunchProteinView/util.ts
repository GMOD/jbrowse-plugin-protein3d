import { Feature } from '@jbrowse/core/util'

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

// see similar function in msaview plugin
export function generateMap(f: Feature, pdbId: string) {
  let iter = 0

  const strand = f.get('strand')
  const subs = f.children() ?? []
  return strand === -1
    ? subs
        .filter(f => f.get('type') === 'CDS')
        .sort((a, b) => b.get('start') - a.get('start'))
        .map(f => {
          const refName = f.get('refName').replace('chr', '')
          const featureStart = f.get('start')
          const featureEnd = f.get('end')
          const phase = f.get('phase')
          const len = featureEnd - featureStart
          const op = len / 3
          const proteinStart = iter
          const proteinEnd = iter + op
          iter += op
          return {
            refName,
            featureStart,
            featureEnd,
            proteinStart,
            proteinEnd,
            pdbId,
            phase,
            strand,
          } as const
        })
    : subs
        .filter(f => f.get('type') === 'CDS')
        .sort((a, b) => a.get('start') - b.get('start'))
        .map(f => {
          const refName = f.get('refName').replace('chr', '')
          const featureStart = f.get('start')
          const featureEnd = f.get('end')
          const phase = f.get('phase')
          const len = featureEnd - featureStart
          const op = len / 3
          const proteinStart = iter
          const proteinEnd = iter + op
          iter += op
          return {
            refName,
            featureStart,
            featureEnd,
            proteinStart,
            proteinEnd,
            phase,
            pdbId,
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

export function getDisplayName(f: Feature) {
  return f.get('name') || f.get('id')
}
