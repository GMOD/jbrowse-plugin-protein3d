import { Feature } from '@jbrowse/core/util'
import { Structure } from 'molstar/lib/mol-model/structure'
import { Script } from 'molstar/lib/mol-script/script'

export const proteinAbbreviationMapping = Object.fromEntries(
  [
    { name: 'alanine', abbreviation: 'Ala', singleLetterCode: 'A' },
    { name: 'arginine', abbreviation: 'Arg', singleLetterCode: 'R' },
    { name: 'asparagine', abbreviation: 'Asn', singleLetterCode: 'N' },
    { name: 'aspartic acid', abbreviation: 'Asp', singleLetterCode: 'D' },
    { name: 'cysteine', abbreviation: 'Cys', singleLetterCode: 'C' },
    { name: 'glutamic acid', abbreviation: 'Glu', singleLetterCode: 'E' },
    { name: 'glutamine', abbreviation: 'Gln', singleLetterCode: 'Q' },
    { name: 'glycine', abbreviation: 'Gly', singleLetterCode: 'G' },
    { name: 'histidine', abbreviation: 'His', singleLetterCode: 'H' },
    { name: 'isoleucine', abbreviation: 'Ile', singleLetterCode: 'I' },
    { name: 'leucine', abbreviation: 'Leu', singleLetterCode: 'L' },
    { name: 'lysine', abbreviation: 'Lys', singleLetterCode: 'K' },
    { name: 'methionine', abbreviation: 'Met', singleLetterCode: 'M' },
    { name: 'phenylalanine', abbreviation: 'Phe', singleLetterCode: 'F' },
    { name: 'proline', abbreviation: 'Pro', singleLetterCode: 'P' },
    { name: 'serine', abbreviation: 'Ser', singleLetterCode: 'S' },
    { name: 'threonine', abbreviation: 'Thr', singleLetterCode: 'T' },
    { name: 'tryptophan', abbreviation: 'Trp', singleLetterCode: 'W' },
    { name: 'tyrosine', abbreviation: 'Tyr', singleLetterCode: 'Y' },
    { name: 'valine', abbreviation: 'Val', singleLetterCode: 'V' },
  ].map(r => [r.abbreviation.toUpperCase(), r]),
)

export function checkHovered(hovered: unknown): hovered is {
  hoverFeature: Feature
  hoverPosition: { coord: number; refName: string }
} {
  return (
    !!hovered &&
    typeof hovered == 'object' &&
    'hoverFeature' in hovered &&
    'hoverPosition' in hovered
  )
}

export function getMolstarStructureSelection({
  structure,
  selectedResidue,
}: {
  structure: Structure
  selectedResidue: number
}) {
  return Script.getStructureSelection(
    Q =>
      Q.struct.generator.atomGroups({
        'residue-test': Q.core.rel.eq([
          Q.struct.atomProperty.macromolecular.label_seq_id(),
          selectedResidue,
        ]),
        'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
      }),
    structure,
  )
}

export function toStr(r: {
  structureSeqPos: number
  code?: string
  chain?: string
}) {
  return [
    `Position: ${r.structureSeqPos}`,
    r.code
      ? `Letter: ${r.code} (${proteinAbbreviationMapping[r.code]?.singleLetterCode})`
      : '',
    r.chain ? `Chain: ${r.chain}` : '',
  ]
    .filter(f => !!f)
    .join(', ')
}

export function invertMap(arg: Record<number, number | undefined>) {
  return Object.fromEntries(Object.entries(arg).map(([a, b]) => [b, a]))
}
