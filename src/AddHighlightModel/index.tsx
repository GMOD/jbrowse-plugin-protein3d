import PluginManager from '@jbrowse/core/PluginManager'
import Highlight from './Highlight'

export default (pluginManager: PluginManager) => {
  pluginManager.addToExtensionPoint(
    'LinearGenomeView-TracksContainerComponent',
    (...args) => {
      console.log({ args })
      return <Highlight model={model} />
    },
  )
}
