import PluginManager from '@jbrowse/core/PluginManager'
import { ViewType } from '@jbrowse/core/pluggableElementTypes'

import stateModelF from './stateModel'
import ReactComponent from './components/ProteinView'

export default function ProteinViewF(pluginManager: PluginManager) {
  pluginManager.addViewType(() => {
    return new ViewType({
      name: 'ProteinView',
      displayName: 'Protein view',
      stateModel: stateModelF(),
      ReactComponent,
    })
  })
}
