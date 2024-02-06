import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { useEffect, useState } from 'react'
import { ProteinViewModel } from '../model'
import { doesIntersect2, getSession } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

export default function useProteinViewClickActionBehavior({
  plugin,
  model,
}: {
  plugin?: PluginContext
  model: ProteinViewModel
}) {
  const [error, setError] = useState<unknown>()
  const session = getSession(model)
  const { seq1, seq2, mapping } = model
  console.log(seq1?.length, seq2?.length, seq1, seq2)
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
          console.log({ mapping })
          if (mapping) {
            for (const entry of mapping) {
              const {
                featureStart,
                featureEnd,
                refName,
                targetProteinStart: proteinStart,
                targetProteinEnd: proteinEnd,
                strand,
              } = entry
              console.log({ proteinStart, proteinEnd })
              if (!proteinStart || !proteinEnd) {
                console.warn('No mapping', proteinStart, proteinEnd)
                break
              } else {
                const c = pos - 1
                console.log(proteinStart, proteinEnd, c, c + 1)
                if (doesIntersect2(proteinStart, proteinEnd, c, c + 1)) {
                  const ret = Math.round((c - proteinStart) * 3)
                  const neg = strand === -1
                  const start = neg ? featureEnd - ret : featureStart + ret
                  const end = neg
                    ? featureEnd - ret - 3
                    : featureStart + ret + 3
                  const [s1, s2] = [Math.min(start, end), Math.max(start, end)]
                  model.setHighlights([
                    {
                      assemblyName: 'hg38',
                      refName,
                      start: s1,
                      end: s2,
                    },
                  ])
                  console.log({ refName, s1, s2 })
                  ;(session.views[0] as LinearGenomeViewModel)
                    .navToLocString(`${refName}:${s1}-${s2}`)
                    .catch(e => {
                      console.error(e)
                      setError(e)
                    })
                }
              }
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
  return { error }
}
