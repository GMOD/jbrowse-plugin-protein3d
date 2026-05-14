import loadMolstar from './loadMolstar'

import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

async function getMolstarRangeSelection({
  structure,
  startResidue,
  endResidue,
}: {
  structure: Structure
  startResidue: number
  endResidue: number
}) {
  const { Script } = await loadMolstar()
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

export default async function highlightResidueRange({
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
  const { StructureSelection } = await loadMolstar()
  const sel = await getMolstarRangeSelection({
    structure,
    startResidue,
    endResidue,
  })
  const loci = StructureSelection.toLociWithSourceUnits(sel)
  plugin.managers.interactivity.lociHighlights.clearHighlights()
  plugin.managers.interactivity.lociHighlights.highlight({ loci })
}

export async function selectResidueRange({
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
  const { StructureSelection } = await loadMolstar()
  const sel = await getMolstarRangeSelection({
    structure,
    startResidue,
    endResidue,
  })
  const loci = StructureSelection.toLociWithSourceUnits(sel)
  plugin.managers.interactivity.lociSelects.deselectAll()
  plugin.managers.interactivity.lociSelects.select({ loci })
}
