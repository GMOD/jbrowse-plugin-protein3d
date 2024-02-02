import React, { useState, useEffect, useRef } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'
// molstar
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'

// locals
import { ProteinViewModel } from '../model'
import { loadStructureFromUrl } from './util'
import { doesIntersect2, getSession } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// note: css must be injected into the js code for jbrowse plugins
import './molstar.css'

const ProteinView = observer(function ({ model }: { model: ProteinViewModel }) {
  const { url, mapping, showControls } = model
  const dimensions = { width: model.width, height: 500 }
  const session = getSession(model)
  const [error, setError] = useState<unknown>()
  const parentRef = useRef<HTMLDivElement>(null)
  const [plugin, setPlugin] = useState<PluginContext>()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (!parentRef.current) {
          return
        }
        const d = document.createElement('div')
        parentRef.current.append(d)
        const p = await createPluginUI({
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

        await loadStructureFromUrl({ url, plugin: p })
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()

    // needs review
  }, [url, showControls])

  useEffect(() => {
    if (!plugin) {
      return
    }

    plugin.state.data.events.changed.subscribe(() => {
      try {
        const clickedLabel =
          plugin.state.getSnapshot().structureFocus?.current?.label

        if (clickedLabel) {
          const [clickPos, chain] = clickedLabel?.split('|') ?? []
          const [code, position] = clickPos.trim().split(' ')
          const pos = +position.trim()
          model.setMouseClickedPosition({ pos, code, chain })
          for (const entry of mapping) {
            const {
              featureStart,
              featureEnd,
              refName,
              proteinStart,
              proteinEnd,
              strand,
            } = entry
            const c = pos - 1
            if (doesIntersect2(proteinStart, proteinEnd, c, c + 1)) {
              const ret = Math.round((c - proteinStart) * 3)
              const neg = strand === -1
              const start = neg ? featureEnd - ret : featureStart + ret
              const end = neg ? featureEnd - ret - 3 : featureStart + ret + 3
              const [s1, s2] = [Math.min(start, end), Math.max(start, end)]
              model.setHighlights([
                {
                  assemblyName: 'hg38',
                  refName,
                  start: s1,
                  end: s2,
                },
              ])
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(session.views[0] as LinearGenomeViewModel).navToLocString(
                `${refName}:${s1}-${s2}`,
              )
            }
          }
        } else {
          model.setMouseClickedPosition(undefined)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })
  }, [plugin, mapping, session, model])

  const width = dimensions.width
  const height = dimensions.height

  return error ? (
    <ErrorMessage error={error} />
  ) : (
    <div>
      <Header model={model} />
      <div ref={parentRef} style={{ position: 'relative', width, height }} />
    </div>
  )
})

const Header = observer(function ({ model }: { model: ProteinViewModel }) {
  const { showControls, mouseClickedString } = model
  return (
    <div>
      {mouseClickedString} <label htmlFor="show_controls">Show controls?</label>
      <input
        id="show_controls"
        type="checkbox"
        checked={showControls}
        onChange={event => model.setShowControls(event.target.checked)}
      />
    </div>
  )
})

const Wrapper = observer(function ({ model }: { model: ProteinViewModel }) {
  const { url } = model
  return (
    <div>
      <div>{url}</div>
      <ProteinView model={model} />
    </div>
  )
})

export default Wrapper
