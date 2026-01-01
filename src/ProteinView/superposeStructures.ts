import { Mat4 } from 'molstar/lib/mol-math/linear-algebra'
import {
  QueryContext,
  StructureElement,
  StructureSelection,
} from 'molstar/lib/mol-model/structure'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { StructureSelectionQueries } from 'molstar/lib/mol-plugin-state/helpers/structure-selection-query'
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects'
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms'
import { PluginCommands } from 'molstar/lib/mol-plugin/commands'
import { StateObjectRef } from 'molstar/lib/mol-state'
import { tmAlign } from 'molstar/lib/mol-model/structure/structure/util/tm-align'

const SuperpositionTag = 'SuperpositionTransform'

export async function superposeStructures(plugin: PluginContext) {
  const structures = plugin.managers.structure.hierarchy.current.structures
  if (structures.length < 2) {
    return
  }

  const { query } = StructureSelectionQueries.trace

  const locis = structures.map(s => {
    const structure = s.cell.obj?.data
    if (!structure) {
      return undefined
    }
    const rootStructure = getRootStructure(plugin, structure)
    if (!rootStructure) {
      return undefined
    }
    const loci = StructureSelection.toLociWithSourceUnits(
      query(new QueryContext(structure)),
    )
    return StructureElement.Loci.remap(loci, rootStructure)
  })

  const validLocis = locis.filter(
    (l): l is StructureElement.Loci => l !== undefined,
  )
  if (validLocis.length < 2) {
    return
  }

  const pivot = plugin.managers.structure.hierarchy.findStructure(
    validLocis[0]?.structure,
  )
  const coordinateSystem = pivot?.transform?.cell.obj?.data.coordinateSystem

  for (let i = 1; i < validLocis.length; i++) {
    const result = tmAlign(validLocis[0]!, validLocis[i]!)
    const { bTransform, tmScoreA, tmScoreB, rmsd, alignedLength } = result
    await transform(
      plugin,
      structures[i]!.cell,
      bTransform,
      coordinateSystem,
    )
    plugin.log.info(
      `TM-align: TM-score=${tmScoreA.toFixed(4)}/${tmScoreB.toFixed(4)}, RMSD=${rmsd.toFixed(2)} Å, aligned ${alignedLength} residues.`,
    )
  }

  await cameraReset(plugin)
}

function getRootStructure(plugin: PluginContext, s: StructureElement.Loci['structure']) {
  const parent = plugin.helpers.substructureParent.get(s)
  if (!parent) {
    return undefined
  }
  return plugin.state.data.selectQ(q =>
    q.byValue(parent).rootOfType(PluginStateObject.Molecule.Structure),
  )[0]?.obj?.data
}

async function transform(
  plugin: PluginContext,
  s: StateObjectRef<PluginStateObject.Molecule.Structure>,
  matrix: Mat4,
  coordinateSystem?: { matrix: Mat4 },
) {
  const r = StateObjectRef.resolveAndCheck(plugin.state.data, s)
  if (!r) {
    return
  }

  const o = plugin.state.data.selectQ(q =>
    q
      .byRef(r.transform.ref)
      .subtree()
      .withTransformer(StateTransforms.Model.TransformStructureConformation),
  )[0]

  const finalTransform =
    coordinateSystem && !Mat4.isIdentity(coordinateSystem.matrix)
      ? Mat4.mul(Mat4(), coordinateSystem.matrix, matrix)
      : matrix

  const params = {
    transform: {
      name: 'matrix' as const,
      params: { data: finalTransform, transpose: false },
    },
  }

  const b = o
    ? plugin.state.data.build().to(o).update(params)
    : plugin.state.data
        .build()
        .to(s)
        .insert(StateTransforms.Model.TransformStructureConformation, params, {
          tags: SuperpositionTag,
        })

  await plugin.runTask(plugin.state.data.updateTree(b))
}

async function cameraReset(plugin: PluginContext) {
  await new Promise(res => requestAnimationFrame(res))
  PluginCommands.Camera.Reset(plugin)
}
