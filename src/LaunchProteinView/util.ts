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
