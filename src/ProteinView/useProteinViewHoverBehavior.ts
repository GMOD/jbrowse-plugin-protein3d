import { useEffect, useState } from 'react'
import { getSession } from '@jbrowse/core/util'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

// local
import { JBrowsePluginProteinViewModel } from './model'
import { proteinToGenomeMapping } from './proteinToGenomeMapping'
import {
  StructureElement,
  StructureProperties,
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
  const { transcriptToProteinMap } = model
  useEffect(() => {
    if (!plugin) {
      return
    }
    plugin.behaviors.interaction.hover.subscribe(event => {
      if (StructureElement.Loci.is(event.current.loci)) {
        const loc = StructureElement.Location.create()
        StructureElement.Loci.getFirstLocation(event.current.loci, loc)
        // or loc = StructureElement.Loci.getFirstLocation(event.current.loci) which is ok to use if you dont do many sequential queries

        console.log(StructureProperties.residue.auth_seq_id(loc))
      }
    })
    // plugin.behaviors.interaction.click.subscribe(event => {
    //   if (StructureElement.Loci.is(event.current.loci)) {
    //     const loc = StructureElement.Location.create()
    //     StructureElement.Loci.getFirstLocation(event.current.loci, loc)
    //     // or loc = StructureElement.Loci.getFirstLocation(event.current.loci) which is ok to use if you dont do many sequential queries

    //     console.log(StructureProperties.residue.auth_seq_id(loc))
    //   }
    // })
  }, [plugin, transcriptToProteinMap, session, model])
  return { error }
}
