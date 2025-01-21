import { useEffect, useRef, useState } from 'react'

// molstar
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'

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
        p = await createPluginUI({
          target: d,
          render: renderReact18,
          spec: {
            ...DefaultPluginUISpec(),
            layout: {
              initial: {
                controlsDisplay: 'reactive',
                showControls,
              },
            },
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
