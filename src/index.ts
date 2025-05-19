import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'

import { version } from '../package.json'
import AddHighlightModelF from './AddHighlightModel'
import AlphaFoldConfidenceAdapterF from './AlphaFoldConfidenceAdapter'
import AlphaMissensePathogenicityAdapterF from './AlphaMissensePathogenicityAdapter'
import LaunchProteinViewF from './LaunchProteinView'
import ProteinViewF from './ProteinView'
import UniProtVariationAdapterF from './UniProtVariationAdapter'

export default class ProteinViewer extends Plugin {
  name = 'ProteinViewer'
  version = version

  install(pluginManager: PluginManager) {
    ProteinViewF(pluginManager)
    LaunchProteinViewF(pluginManager)
    AddHighlightModelF(pluginManager)
    AlphaFoldConfidenceAdapterF(pluginManager)
    AlphaMissensePathogenicityAdapterF(pluginManager)
    UniProtVariationAdapterF(pluginManager)
  }

  configure(_pluginManager: PluginManager) {}
}
