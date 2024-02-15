import { useEffect, useState } from 'react'
import { getSession } from '@jbrowse/core/util'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

// local
import { JBrowsePluginProteinViewModel } from './model'
import { clickProteinToGenome } from './proteinToGenomeMapping'
import {
  StructureElement,
  StructureProperties as Props,
} from 'molstar/lib/mol-model/structure'

export default function useProteinViewClickActionBehavior({
  plugin,
  model,
}: {
  plugin?: PluginContext
  model: JBrowsePluginProteinViewModel
}) {
  const [error, setError] = useState<unknown>()
  const session = getSession(model)
  const { genomeToTranscriptMapping } = model
  useEffect(() => {
    if (!plugin) {
      return
    }
    plugin.behaviors.interaction.click.subscribe(event => {
      if (StructureElement.Loci.is(event.current.loci)) {
        const loc = StructureElement.Loci.getFirstLocation(event.current.loci)
        if (loc) {
          const pos = Props.residue.auth_seq_id(loc)
          const code = Props.atom.label_comp_id(loc)
          const chain = Props.chain.auth_asym_id(loc)
          model.setHoveredPosition({
            pos: pos - 1,
            type: 'StructurePosition',
            code,
            chain,
          })

          clickProteinToGenome({ model, pos: pos - 1 }).catch(e => {
            console.error(e)
            setError(e)
          })
        }
      }
    })
  }, [plugin, genomeToTranscriptMapping, session, model])
  return { error }
}
