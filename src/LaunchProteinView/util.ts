import { Feature } from '@jbrowse/core/util'
import { ungzip } from 'pako'
import { useEffect, useState } from 'react'

async function myfetch(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}: ${await res.text()}`)
  }
  return res.arrayBuffer()
}

export interface Row {
  gene_id: string
  gene_id_version: string
  transcript_id_version: string
  transcript_id: string
  pdb_id: string
  refseq_mrna_predicted_id: string
  refseq_mrna_id: string
}

export function check(row: Row, val: string) {
  return (
    (row.transcript_id === val ||
      row.refseq_mrna_id === val ||
      row.transcript_id_version === val) &&
    row.pdb_id
  )
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
