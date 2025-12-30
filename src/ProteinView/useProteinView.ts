import { useEffect, useRef, useState } from 'react'

// molstar
import { GeometryExport } from 'molstar/lib/extensions/geo-export'
import { PluginConfig } from 'molstar/lib/mol-plugin/config'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { PluginSpec } from 'molstar/lib/mol-plugin/spec'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'

export const ExtensionMap = {
  'geo-export': PluginSpec.Behavior(GeometryExport),
}

export default function useProteinView({
  showControls,
}: {
  showControls: boolean
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [plugin, setPlugin] = useState<PluginContext>()
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    let p: PluginContext | undefined
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (!parentRef.current) {
          return
        }
        const d = document.createElement('div')
        parentRef.current.append(d)
        const defaultSpec = DefaultPluginUISpec()
        p = await createPluginUI({
          target: d,
          render: renderReact18,
          spec: {
            ...DefaultPluginUISpec(),
            // extensions: Object.keys(ExtensionMap),
            behaviors: [
              ...defaultSpec.behaviors,
              PluginSpec.Behavior(GeometryExport),
            ],
            layout: {
              initial: {
                controlsDisplay: 'reactive',
                showControls,
              },
            },
            config: [[PluginConfig.Viewport.ShowExpand, false]],
          },
        })
        await p.initialized
        setPlugin(p)
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
    return () => {
      p?.unmount()
    }
  }, [showControls])

  return { parentRef, error, plugin }
}
