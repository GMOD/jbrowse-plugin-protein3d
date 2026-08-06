// Loads a structure through the SAME molstar path the plugin uses
// (addStructureFromURL -> createModel -> extractEntities) and then introspects
// the loaded structure for per-entity / per-chain facts the plugin does not
// surface. The point is faithfulness: the entities here are byte-for-byte what
// `structureModel.entities` would hold, so the diagnosis can run the plugin's
// own chooseMappedEntity over them and report what it would really do.
import {
  StructureElement,
  StructureProperties as SP,
} from 'molstar/lib/mol-model/structure'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'
import { PluginConfig } from 'molstar/lib/mol-plugin/config'

import { addStructureFromURL } from '../src/ProteinView/addStructureFromURL'
import { extractEntities } from '../src/ProteinView/extractStructureSequences'

import type { PluginContext } from 'molstar/lib/mol-plugin/context'

export interface EntityInfo {
  /** index into the plugin's entities array */
  index: number
  entityId: string
  description: string
  /** auth_asym_id chain labels that instantiate this entity */
  chains: string[]
  /** full entity_poly sequence (incl. unmodeled residues), label-indexed */
  seq: string
  seqLength: number
  /** molstar label_seq_id of each residue in `seq`. Usually 1..N; a PDB-format
   * file with no SEQRES reports the author numbering instead. */
  seqIds: number[]
  /** distinct label_seq_id values that actually have coordinates */
  observedCount: number
}

export interface LoadedStructure {
  entities: EntityInfo[]
  /** non-polymer entity descriptions (ligands etc), for context */
  ligands: string[]
}

export async function createPlugin(
  target: HTMLElement,
): Promise<PluginContext> {
  const spec = DefaultPluginUISpec()
  const plugin = await createPluginUI({
    target,
    render: renderReact18,
    spec: {
      ...spec,
      layout: { initial: { controlsDisplay: 'reactive', showControls: false } },
      config: [[PluginConfig.Viewport.ShowExpand, false]],
    },
  })
  await plugin.initialized
  return plugin
}

export async function loadAndIntrospect({
  url,
  plugin,
}: {
  url: string
  plugin: PluginContext
}): Promise<LoadedStructure> {
  await plugin.clear()
  const { model } = await addStructureFromURL({ url, plugin })
  if (!model) {
    throw new Error('molstar returned no model')
  }

  const data = model.obj?.data
  if (!data) {
    throw new Error('no model data')
  }
  const seqEntities = extractEntities(model) ?? []

  const structure =
    plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data
  if (!structure) {
    throw new Error('no loaded structure')
  }

  // Walk every modeled atom once, collapse to residues, bucket by entityId.
  const byEntity = new Map<
    string,
    {
      chains: Set<string>
      observed: Set<number>
      description: string
      type: string
    }
  >()
  const loc = StructureElement.Location.create(structure)
  for (const unit of structure.units) {
    loc.unit = unit
    const els = unit.elements
    for (let i = 0; i < els.length; i++) {
      loc.element = els[i]!
      const entityId = SP.entity.id(loc)
      let bucket = byEntity.get(entityId)
      if (!bucket) {
        const desc = SP.entity.pdbx_description(loc)
        bucket = {
          chains: new Set(),
          observed: new Set(),
          description:
            (Array.isArray(desc) ? desc.join(', ') : desc) || entityId,
          type: SP.entity.type(loc),
        }
        byEntity.set(entityId, bucket)
      }
      bucket.chains.add(SP.chain.auth_asym_id(loc))
      const labelSeq = SP.residue.label_seq_id(loc)
      if (labelSeq > 0) {
        bucket.observed.add(labelSeq)
      }
    }
  }

  const entities: EntityInfo[] = seqEntities.map((e, index) => {
    const b = byEntity.get(e.entityId)
    return {
      index,
      entityId: e.entityId,
      description: b?.description ?? e.entityId,
      chains: b ? [...b.chains].sort() : [],
      seq: e.seq,
      seqLength: e.seq.length,
      seqIds: e.seqIds,
      observedCount: b ? b.observed.size : 0,
    }
  })

  const ligands = [...byEntity.values()]
    .filter(b => b.type !== 'polymer' && b.type !== 'water')
    .map(b => b.description)

  return { entities, ligands }
}
