import { Structure, StructureSelection } from 'molstar/lib/mol-model/structure'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { Script } from 'molstar/lib/mol-script/script'

export function getMolstarRangeSelection({
  structure,
  startResidue,
  endResidue,
}: {
  structure: Structure
  startResidue: number
  endResidue: number
}) {
  return Script.getStructureSelection(
    Q =>
      Q.struct.generator.atomGroups({
        'residue-test': Q.core.logic.and([
          Q.core.rel.gre([
            Q.struct.atomProperty.macromolecular.label_seq_id(),
            startResidue,
          ]),
          Q.core.rel.lte([
            Q.struct.atomProperty.macromolecular.label_seq_id(),
            endResidue,
          ]),
        ]),
        'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
      }),
    structure,
  )
}

export default function highlightResidueRange({
  structure,
  startResidue,
  endResidue,
  plugin,
}: {
  structure: Structure
  startResidue: number
  endResidue: number
  plugin: PluginContext
}) {
  const sel = getMolstarRangeSelection({
    structure,
    startResidue,
    endResidue,
  })
  const loci = StructureSelection.toLociWithSourceUnits(sel)
  plugin.managers.interactivity.lociHighlights.clearHighlights()
  plugin.managers.interactivity.lociHighlights.highlight({ loci })
}
