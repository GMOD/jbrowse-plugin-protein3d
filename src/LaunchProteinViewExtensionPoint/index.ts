import type PluginManager from '@jbrowse/core/PluginManager'
import type { AbstractSessionModel } from '@jbrowse/core/util'

export default function LaunchProteinViewExtensionPointF(
  pluginManager: PluginManager,
) {
  pluginManager.addToExtensionPoint(
    'LaunchView-ProteinView',
    // LaunchView extension points are typed as transformers `(extendee, props)
    // => extendee`, but in practice JBrowse invokes them as side-effect
    // handlers and ignores the return value. Casting away the signature
    // mismatch rather than fabricating a fake return.
    // @ts-expect-error
    async ({
      session,
      url,
      userProvidedTranscriptSequence,
      feature,
      connectedViewId,
      connectedView,
      alignmentAlgorithm,
      displayName,
      height,
      showControls,
      showHighlight,
      zoomToBaseLevel,
    }: {
      session: AbstractSessionModel
      url?: string
      userProvidedTranscriptSequence?: string
      feature?: Record<string, unknown>
      connectedViewId?: string
      connectedView?: {
        loc?: string
        assembly?: string
        tracks?: (string | Record<string, unknown>)[]
      }
      alignmentAlgorithm?: string
      displayName?: string
      height?: number
      showControls?: boolean
      showHighlight?: boolean
      zoomToBaseLevel?: boolean
    }) => {
      if (!url) {
        throw new Error('No URL provided when launching protein view')
      }

      // A session spec launches each view independently with an auto-generated
      // id, so it cannot pre-compute a connectedViewId to cross-reference. When
      // `connectedView` is supplied we create the LinearGenomeView here and wire
      // its id, letting a single spec entry produce a connected genome+protein
      // pair (e.g. hover a variant to highlight the residue).
      const resolvedConnectedViewId =
        connectedViewId ??
        (connectedView
          ? session.addView('LinearGenomeView', {
              type: 'LinearGenomeView',
              init: connectedView,
            }).id
          : undefined)

      session.addView('ProteinView', {
        type: 'ProteinView',
        alignmentAlgorithm,
        displayName,
        height,
        showControls,
        showHighlight,
        zoomToBaseLevel,
        structures: [
          {
            url,
            userProvidedTranscriptSequence:
              userProvidedTranscriptSequence ?? '',
            feature,
            connectedViewId: resolvedConnectedViewId,
          },
        ],
      })
    },
  )
}
