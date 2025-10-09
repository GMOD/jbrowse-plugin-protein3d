import { type PluginContext } from 'molstar/lib/mol-plugin/context'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'

/**
 * Higher-order function that creates a temporary Molstar plugin instance,
 * executes a callback with it, and ensures proper cleanup
 * @param callback - Function to execute with the plugin instance
 * @returns Result from the callback function
 */
export async function withTemporaryMolstarPlugin<T>(
  callback: (plugin: PluginContext) => Promise<T>,
): Promise<T> {
  const ret = document.createElement('div')
  const plugin = await createPluginUI({
    target: ret,
    render: renderReact18,
  })

  try {
    return await callback(plugin)
  } finally {
    plugin.unmount()
    ret.remove()
  }
}
