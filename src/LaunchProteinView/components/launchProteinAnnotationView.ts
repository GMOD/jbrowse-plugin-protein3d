import { Feature, SessionWithAddTracks } from '@jbrowse/core/util'

import { setupProteinAssembly } from './proteinAssemblySetup'
import { addAllProteinTracks } from './proteinTrackSetup'
import { getGeneDisplayName, getTranscriptDisplayName } from './util'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

/**
 * Launches a protein annotation view for a UniProt entry
 * Creates assembly, adds annotation tracks, and navigates to the protein view
 */
export async function launchProteinAnnotationView({
  session,
  feature,
  selectedTranscript,
  uniprotId,
  confidenceUrl,
}: {
  session: SessionWithAddTracks
  feature: Feature
  selectedTranscript?: Feature
  uniprotId: string
  confidenceUrl?: string
}) {
  // Set up the protein assembly
  setupProteinAssembly(session, uniprotId)

  // Add all annotation tracks
  await addAllProteinTracks({
    session,
    uniprotId,
    confidenceUrl,
  })

  // Create and navigate to the view
  const view = session.addView('LinearGenomeView', {
    type: 'LinearGenomeView',
    displayName: [
      'Protein view',
      uniprotId,
      getGeneDisplayName(feature),
      getTranscriptDisplayName(selectedTranscript),
    ].join(' - '),
  }) as LinearGenomeViewModel

  await view.navToLocString(uniprotId, uniprotId)
}
