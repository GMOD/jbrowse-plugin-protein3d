import { useEffect } from 'react'
import { getSession } from '@jbrowse/core/util'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

// local
import { JBrowsePluginProteinViewModel } from './model'
import {
  StructureElement,
  StructureProperties as Props,
} from 'molstar/lib/mol-model/structure'
import { hoverProteinToGenome } from './proteinToGenomeMapping'

export default function useProteinViewClickActionBehavior({
  plugin,
  model,
}: {
  plugin?: PluginContext
  model: JBrowsePluginProteinViewModel
}) {
  const session = getSession(model)
  const { genomeToTranscriptMapping } = model
  useEffect(() => {
    if (!plugin) {
      return
    }
    plugin.behaviors.interaction.hover.subscribe(event => {
      if (StructureElement.Loci.is(event.current.loci)) {
        const loc = StructureElement.Loci.getFirstLocation(event.current.loci)
        if (loc) {
          // example code for this label
          // https://github.com/molstar/molstar/blob/60550cfea1f62a50a764d5714307d6d1049be71d/src/mol-theme/label.ts#L255-L264
          const pos = Props.residue.auth_seq_id(loc)
          const code = Props.atom.label_comp_id(loc)
          const chain = Props.chain.auth_asym_id(loc)
          model.setHoveredPosition({
            pos: pos - 1,
            type: 'StructurePosition',
            code,
            chain,
          })
          hoverProteinToGenome({ model, pos: pos - 1 })
        }
      }
    })
  }, [plugin, genomeToTranscriptMapping, session, model])
}
