import React from 'react'
import { Link, Typography } from '@mui/material'
import { Feature } from '@jbrowse/core/util'

// locals
import { getDisplayName } from './util'
import MSATable from './MSATable'

function NotFound({ uniprotId }: { uniprotId: string }) {
  return (
    <Typography>
      No structure found for this UniProtID in AlphaFoldDB{' '}
      <Link
        target="_blank"
        href={`https://alphafold.ebi.ac.uk/search/text/${uniprotId}`}
      >
        (search for results)
      </Link>
    </Typography>
  )
}

export default function AlphaFoldDBSearchStatus({
  uniprotId,
  selectedTranscript,
  structureSequence,
  isoformSequences,
}: {
  uniprotId?: string
  selectedTranscript: Feature
  structureSequence?: string
  isoformSequences: Record<string, { feature: Feature; seq: string }>
}) {
  const url = uniprotId
    ? `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.cif`
    : undefined
  const url2 = uniprotId
    ? `https://www.uniprot.org/uniprotkb/${uniprotId}/entry`
    : undefined

  return !uniprotId ? (
    <Typography>
      Searching {getDisplayName(selectedTranscript)} for UniProt ID
    </Typography>
  ) : (
    <>
      <Typography>
        Found Uniprot ID:{' '}
        <a href={url2} target="_blank" rel="noreferrer">
          {uniprotId}
        </a>
      </Typography>
      <Typography>
        AlphaFoldDB link:{' '}
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </Typography>
      {structureSequence ? (
        <MSATable
          structureSequence={structureSequence}
          structureName={uniprotId}
          isoformSequences={isoformSequences}
        />
      ) : (
        <NotFound uniprotId={uniprotId} />
      )}
    </>
  )
}
