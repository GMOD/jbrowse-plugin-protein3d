import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { Structure, StructureSelection } from 'molstar/lib/mol-model/structure'
import { getMolstarStructureSelection } from './util'

export default function highlightResidue({
  structure,
  selectedResidue,
  plugin,
}: {
  structure: Structure
  selectedResidue: number
  plugin: PluginContext
}) {
  const sel = getMolstarStructureSelection({
    structure,
    selectedResidue: selectedResidue + 1,
  })
  const loci = StructureSelection.toLociWithSourceUnits(sel)
  plugin?.managers.interactivity.lociHighlights.clearHighlights()
  plugin?.managers.interactivity.lociHighlights.highlight({
    loci,
  })
}
