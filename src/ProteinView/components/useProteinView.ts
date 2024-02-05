import { useState, useEffect, useRef } from 'react'
// molstar
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'

// locals
import { loadStructureFromURL } from './loadStructureFromURL'

export default function useProteinView({
  url,
  showControls,
}: {
  url: string
  showControls: boolean
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [plugin, setPlugin] = useState<PluginContext>()
  const [error, setError] = useState<unknown>()
  const [seq, setSeq] = useState('')

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
        setPlugin(p)

        const { seq } = await loadStructureFromURL({ url, plugin: p })
        setSeq(seq)
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
    return () => {
      console.log('t1')
      p?.unmount()
    }
  }, [url, showControls])

  return { parentRef, error, plugin, seq }
}
