import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { Script } from 'molstar/lib/mol-script/script'
import { StructureSelection } from 'molstar/lib/mol-model/structure'

export default function highlightResidue({
  selectedResidue,
  plugin,
}: {
  selectedResidue: number
  plugin: PluginContext
}) {
  const data =
    plugin?.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data
  if (!data) {
    return
  }

  const seq_id = selectedResidue
  const sel = Script.getStructureSelection(
    Q =>
      Q.struct.generator.atomGroups({
        'residue-test': Q.core.rel.eq([
          Q.struct.atomProperty.macromolecular.label_seq_id(),
          seq_id,
        ]),
        'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
      }),
    data,
  )
  const loci = StructureSelection.toLociWithSourceUnits(sel)
  plugin?.managers.interactivity.lociHighlights.clearHighlights()
  plugin?.managers.interactivity.lociHighlights.highlight({
    loci,
  })
}
