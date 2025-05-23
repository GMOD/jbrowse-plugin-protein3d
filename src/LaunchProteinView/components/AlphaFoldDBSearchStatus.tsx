import React, { useState } from 'react'

import { Feature } from '@jbrowse/core/util'
import { Button, Typography } from '@mui/material'

import MSATable from './MSATable'
import { getDisplayName } from './util'
import ExternalLink from '../../components/ExternalLink'

function NotFound({ uniprotId }: { uniprotId: string }) {
  return (
    <Typography>
      No structure found for this UniProtID in AlphaFoldDB{' '}
      <ExternalLink
        href={`https://alphafold.ebi.ac.uk/search/text/${uniprotId}`}
      >
        (search for results)
      </ExternalLink>
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
  const [showAllProteinSequences, setShowAllProteinSequences] = useState(false)

  return uniprotId ? (
    <>
      <div>
        <Typography>
          UniProt link: <ExternalLink href={url2}>{uniprotId}</ExternalLink>
        </Typography>
        <Typography>
          AlphaFoldDB link: <ExternalLink href={url}>{url}</ExternalLink>
        </Typography>
      </div>
      {structureSequence ? (
        <div style={{ margin: 20 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setShowAllProteinSequences(!showAllProteinSequences)
            }}
          >
            {showAllProteinSequences
              ? 'Hide all isoform protein sequences'
              : 'Show all isoform protein sequences'}
          </Button>
          {showAllProteinSequences ? (
            <MSATable
              structureSequence={structureSequence}
              structureName={uniprotId}
              isoformSequences={isoformSequences}
            />
          ) : null}
        </div>
      ) : (
        <NotFound uniprotId={uniprotId} />
      )}
    </>
  ) : (
    <Typography>
      Searching {getDisplayName(selectedTranscript)} for UniProt ID
    </Typography>
  )
}
