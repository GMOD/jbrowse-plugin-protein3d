import { Feature } from '@jbrowse/core/util'

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
  return s?.replace(/\.[^./]+$/, '')
}

export function z(n: number) {
  return n.toLocaleString('en-US')
}

export function getDisplayName(f: Feature): string {
  return f.get('name') ?? f.get('id')
}

export function getId(val?: Feature): string {
  return val === undefined ? '' : val.id()
}

export function getTranscriptDisplayName(val?: Feature): string {
  return val === undefined
    ? ''
    : [val.get('name') ?? val.get('id')].filter(f => !!f).join(' ')
}

export function getGeneDisplayName(val?: Feature): string {
  return val === undefined
    ? ''
    : [val.get('gene_name') ?? val.get('name') ?? val.get('id')]
        .filter(f => !!f)
        .join(' ')
}

export function getUniprotIdFromFeature(f?: Feature): string | undefined {
  if (!f) {
    return undefined
  }
  return f.get('uniprot') ?? f.get('uniprotId') ?? f.get('uniprotid')
}
