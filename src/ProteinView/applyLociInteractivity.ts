import loadMolstar from './loadMolstar'

import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'
import type { MolScriptBuilder } from 'molstar/lib/mol-script/language/builder'
import type { Expression } from 'molstar/lib/mol-script/language/expression'

type ResidueTest = (Q: typeof MolScriptBuilder) => Expression

/**
 * Which residues a highlight/selection should cover. `range` is an inclusive
 * label_seq_id span; `list` is an explicit set of label_seq_ids.
 */
export type ResidueSpec =
  | { kind: 'range'; startResidue: number; endResidue: number }
  | { kind: 'list'; residues: number[] }

const seqId = (Q: typeof MolScriptBuilder) =>
  Q.struct.atomProperty.macromolecular.label_seq_id()

const specToTest = (spec: ResidueSpec): ResidueTest =>
  spec.kind === 'range'
    ? Q =>
        Q.core.logic.and([
          Q.core.rel.gre([seqId(Q), spec.startResidue]),
          Q.core.rel.lte([seqId(Q), spec.endResidue]),
        ])
    : Q =>
        Q.core.logic.or(
          spec.residues.map(residue => Q.core.rel.eq([seqId(Q), residue])),
        )

const isActive = (spec: ResidueSpec | undefined): spec is ResidueSpec =>
  spec !== undefined && (spec.kind === 'range' || spec.residues.length > 0)

/**
 * Reconcile one interactivity channel (hover-`highlight` or click-`select`) to
 * the desired residue spec. Passing `undefined` (or an empty `list`) clears the
 * channel, so callers describe the target state declaratively rather than
 * juggling clear/apply calls.
 */
export async function setMolstarLoci({
  structure,
  plugin,
  channel,
  spec,
}: {
  structure: Structure
  plugin: PluginContext
  channel: 'highlight' | 'select'
  spec: ResidueSpec | undefined
}) {
  const { lociHighlights, lociSelects } = plugin.managers.interactivity
  if (channel === 'highlight') {
    lociHighlights.clearHighlights()
  } else {
    lociSelects.deselectAll()
  }

  if (isActive(spec)) {
    const { StructureSelection, Script } = await loadMolstar()
    const sel = Script.getStructureSelection(
      Q =>
        Q.struct.generator.atomGroups({
          'residue-test': specToTest(spec)(Q),
          'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
        }),
      structure,
    )
    const loci = StructureSelection.toLociWithSourceUnits(sel)
    if (channel === 'highlight') {
      lociHighlights.highlight({ loci })
    } else {
      lociSelects.select({ loci })
    }
  }
}
