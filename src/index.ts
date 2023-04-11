import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import { AbstractSessionModel, isAbstractMenuManager } from '@jbrowse/core/util'
import 'regenerator-runtime/runtime.js'

import { version } from '../package.json'
import ProteinViewF from './ProteinView'

export default class ProteinViewer extends Plugin {
  name = 'ProteinViewer'
  version = version

  install(pluginManager: PluginManager) {
    ProteinViewF(pluginManager)
  }

  configure(pluginManager: PluginManager) {
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Protein View',
        onClick: (session: AbstractSessionModel) => {
          session.addView('ProteinView', {})
        },
      })
    }
  }
}
