import PluginManager from '@jbrowse/core/PluginManager'
import { ViewType } from '@jbrowse/core/pluggableElementTypes'

import stateModel from './stateModel'
import ReactComponent from './components/ProteinView'

export default (pluginManager: PluginManager) => {
  pluginManager.addViewType(() => {
    return new ViewType({
      name: 'ProteinView',
      displayName: 'Protein view',
      stateModel,
      ReactComponent,
    })
  })
}
