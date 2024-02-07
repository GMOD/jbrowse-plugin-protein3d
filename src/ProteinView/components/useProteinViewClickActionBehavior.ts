import { useEffect, useState } from 'react'
import { getSession } from '@jbrowse/core/util'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

// local
import { ProteinViewModel } from '../model'
import { proteinToGenomeMapping } from './proteinToGenomeMapping'

export default function useProteinViewClickActionBehavior({
  plugin,
  model,
}: {
  plugin?: PluginContext
  model: ProteinViewModel
}) {
  const [error, setError] = useState<unknown>()
  const session = getSession(model)
  const { mapping } = model
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
  }, [plugin, mapping, session, model])
  return { error }
}
