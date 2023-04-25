import React from 'react'
import PluginManager from '@jbrowse/core/PluginManager'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import Highlight from './Highlight'

export default (pluginManager: PluginManager) => {
  pluginManager.addToExtensionPoint(
    'LinearGenomeView-TracksContainerComponent',
    // @ts-expect-error
    (
      rest: React.ReactNode[] = [],
      { model }: { model: LinearGenomeViewModel },
    ) => {
      return [
        ...rest,
        <Highlight key="highlight_protein_viewer" model={model} />,
      ]
    },
  )
}
