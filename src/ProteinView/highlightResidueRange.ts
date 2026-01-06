import { Structure, StructureSelection } from 'molstar/lib/mol-model/structure'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import {
  clearStructureOverpaint,
  setStructureOverpaint,
} from 'molstar/lib/mol-plugin-state/helpers/structure-overpaint'
import { Script } from 'molstar/lib/mol-script/script'
import { Color } from 'molstar/lib/mol-util/color'

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

export function selectResidueRange({
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
  plugin.managers.interactivity.lociSelects.deselectAll()
  plugin.managers.interactivity.lociSelects.select({ loci })
}

export function hexToMolstarColor(hex: string) {
  const cleanHex = hex.replace('#', '')
  return Color(parseInt(cleanHex, 16))
}

export async function overpaintResidueRange({
  startResidue,
  endResidue,
  plugin,
  color,
}: {
  startResidue: number
  endResidue: number
  plugin: PluginContext
  color: string
}) {
  const structureRef = plugin.managers.structure.hierarchy.current.structures[0]
  if (structureRef) {
    await setStructureOverpaint(
      plugin,
      structureRef.components,
      hexToMolstarColor(color),
      async structure => {
        const sel = getMolstarRangeSelection({
          structure,
          startResidue,
          endResidue,
        })
        return StructureSelection.toLociWithSourceUnits(sel)
      },
    )
  }
}

export async function clearOverpaint(plugin: PluginContext) {
  const structureRef = plugin.managers.structure.hierarchy.current.structures[0]
  if (structureRef) {
    await clearStructureOverpaint(plugin, structureRef.components)
  }
}
