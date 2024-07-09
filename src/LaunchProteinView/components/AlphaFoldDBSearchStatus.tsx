import React from 'react'
import { Link, Typography } from '@mui/material'
import { Feature } from '@jbrowse/core/util'
import { LoadingEllipses } from '@jbrowse/core/ui'

// locals
import { getDisplayName } from '../util'
import MSATable from './MSATable'

function NotFound({ foundStructureId }: { foundStructureId: string }) {
  return (
    <Typography>
      No structure found for this UniProtID in AlphaFoldDB{' '}
      <Link
        target="_blank"
        href={`https://alphafold.ebi.ac.uk/search/text/${foundStructureId}`}
      >
        (search for results)
      </Link>
    </Typography>
  )
}

export default function AlphaFoldDBSearchStatus({
  foundStructureId,
  selectedTranscript,
  structureSequence,
  isLoading,
  isoformSequences,
}: {
  foundStructureId?: string
  selectedTranscript: Feature
  structureSequence?: string
  isLoading: boolean
  isoformSequences: Record<string, { feature: Feature; seq: string }>
}) {
  return !foundStructureId ? (
    <Typography>
      Searching {getDisplayName(selectedTranscript)} for UniProt ID
    </Typography>
  ) : (
    <>
      <Typography>Found Uniprot ID: {foundStructureId}</Typography>
      {isLoading ? (
        <LoadingEllipses title="Looking up structure in AlphaFoldDB" />
      ) : structureSequence ? (
        <div>
          <Typography>Found structure in AlphaFoldDB</Typography>
          <MSATable
            structureSequence={structureSequence}
            structureName={foundStructureId}
            isoformSequences={isoformSequences}
          />
        </div>
      ) : (
        <NotFound foundStructureId={foundStructureId} />
      )}
    </>
  )
}
