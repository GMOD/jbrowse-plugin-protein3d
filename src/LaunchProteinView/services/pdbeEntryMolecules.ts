// The polymer entities of a PDB entry, as PDBe already knows them. The dialog
// wants the entry's residues only to annotate the isoform list, and reading
// them out of the structure file meant downloading and parsing the whole
// mmCIF — minutes for a ribosome, for a label. This is a few kB of JSON, and
// the view downloads the file itself when the user actually launches.

export function pdbeEntryMoleculesUrl(pdbId: string) {
  return `https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/${pdbId.toLowerCase()}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * One sequence per protein entity, in entity order. Nucleic-acid entities are
 * left out: A, C, G, T and U are amino-acid letters too, so a DNA chain scores
 * as a candidate rather than losing honestly.
 */
export function parseEntryMolecules(json: unknown): string[] {
  const entities = isRecord(json) ? Object.values(json)[0] : undefined
  if (!Array.isArray(entities)) {
    return []
  }
  return entities.flatMap(entity => {
    if (!isRecord(entity)) {
      return []
    }
    const { molecule_type: type, sequence } = entity
    return typeof type === 'string' &&
      type.startsWith('polypeptide') &&
      typeof sequence === 'string' &&
      sequence.length > 0
      ? [sequence]
      : []
  })
}
