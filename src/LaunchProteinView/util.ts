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
