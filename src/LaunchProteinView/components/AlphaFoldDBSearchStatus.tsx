import React from 'react'
import { Link, Typography } from '@mui/material'
import { Feature } from '@jbrowse/core/util'
import { LoadingEllipses } from '@jbrowse/core/ui'

// locals
import { getDisplayName } from '../util'

export default function AlphaFoldDBSearchStatus({
  foundStructureId,
  selectedTranscript,
  success,
  loading,
}: {
  foundStructureId?: string
  selectedTranscript: Feature
  success: boolean
  loading: boolean
}) {
  return !foundStructureId ? (
    <Typography>
      Searching {getDisplayName(selectedTranscript)} for UniProt ID
    </Typography>
  ) : (
    <>
      <Typography>Found Uniprot ID: {foundStructureId}</Typography>
      {loading ? (
        <LoadingEllipses title="Looking up structure in AlphaFoldDB" />
      ) : success ? (
        <Typography>Found structure in AlphaFoldDB</Typography>
      ) : (
        <Typography>
          No structure found for this UniProtID in AlphaFoldDB{' '}
          <Link
            target="_blank"
            href={`https://alphafold.ebi.ac.uk/search/text/${foundStructureId}`}
          >
            (search for results)
          </Link>
        </Typography>
      )}
    </>
  )
}
