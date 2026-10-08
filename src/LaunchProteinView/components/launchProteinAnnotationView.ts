import { setupProteinAssembly } from './proteinAssemblySetup'
import {
  addAllProteinTracks,
  fetchUniProtFeatureTypes,
} from './proteinTrackSetup'
import { formatViewName } from '../utils/launchViewUtils'

import type { Protein1DLinkage } from '../../Protein1DLinkage'
import type { Feature, SessionWithAddSessionTrack } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

export async function launchProteinAnnotationView({
  session,
  feature,
  selectedTranscript,
  uniprotId,
  confidenceUrl,
  connectedViewId,
  connectedAssemblyName,
}: {
  session: Pick<
    SessionWithAddSessionTrack,
    'addView' | 'addTemporaryAssembly' | 'addSessionTrackConf'
  > & { assemblyManager: { get: (name: string) => unknown } }
  feature: Feature
  selectedTranscript?: Feature
  uniprotId: string
  confidenceUrl?: string
  connectedViewId?: string
  connectedAssemblyName?: string
}) {
  // A second view of an entry, another isoform's say, shares the first's
  // assembly and tracks; adding them again makes the host warn
  if (!session.assemblyManager.get(uniprotId)) {
    // Fetched before anything is added: a failed download would otherwise
    // leave a temporary assembly behind with no view on it
    const featureTypes = await fetchUniProtFeatureTypes(uniprotId)
    setupProteinAssembly(session, uniprotId)
    addAllProteinTracks({
      session,
      uniprotId,
      featureTypes,
      confidenceUrl,
    })
  }

  // The linkage drives the 1D<->genome hover highlight. It is a property of
  // the view (see Protein1DLinkage) so it is saved with the session.
  const proteinLinkage: Protein1DLinkage | undefined =
    connectedViewId && selectedTranscript
      ? {
          connectedViewId,
          assemblyName: connectedAssemblyName,
          feature: selectedTranscript.toJSON(),
          uniprotId,
        }
      : undefined

  // a named object, because proteinLinkage comes from this plugin's own
  // LinearGenomeView extension, which the launch snapshot type cannot see
  const snapshot = {
    type: 'LinearGenomeView' as const,
    displayName: formatViewName(
      'Protein annotations',
      feature,
      selectedTranscript,
      uniprotId,
    ),
    proteinLinkage,
  }
  const view = session.addView(
    'LinearGenomeView',
    snapshot,
  ) as LinearGenomeViewModel

  await view.navToLocString(uniprotId, uniprotId)
}
