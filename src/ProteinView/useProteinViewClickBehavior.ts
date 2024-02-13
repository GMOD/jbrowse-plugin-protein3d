import { useEffect, useState } from 'react'
import { getSession } from '@jbrowse/core/util'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

// local
import { JBrowsePluginProteinViewModel } from './model'
import { proteinToGenomeMapping } from './proteinToGenomeMapping'

export default function useProteinViewClickActionBehavior({
  plugin,
  model,
}: {
  plugin?: PluginContext
  model: JBrowsePluginProteinViewModel
}) {
  const [error, setError] = useState<unknown>()
  const session = getSession(model)
  const { transcriptToProteinMap } = model
  useEffect(() => {
    if (!plugin) {
      return
    }
    const { state } = plugin

    state.data.events.changed.subscribe(() => {
      try {
        const clickedLabel = state.getSnapshot().structureFocus?.current?.label
        if (clickedLabel) {
          const [clickPos, chain] = clickedLabel?.split('|') ?? []
          const [code, position] = clickPos.trim().split(' ')
          const pos = +position.trim()
          model.setMouseClickedPosition({ pos, code, chain })
          proteinToGenomeMapping({ model, pos }).catch(e => {
            console.error(e)
            setError(e)
          })
        } else {
          model.setMouseClickedPosition(undefined)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })
  }, [plugin, transcriptToProteinMap, session, model])
  return { error }
}
