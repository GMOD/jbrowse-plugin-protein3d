export const CLINVAR_BUILDS = ['GRCh38', 'GRCh37'] as const

export type ClinVarBuild = (typeof CLINVAR_BUILDS)[number]

const BUILD_NAMES: Record<ClinVarBuild, readonly string[]> = {
  GRCh38: ['grch38', 'hg38'],
  GRCh37: ['grch37', 'hg19'],
}

/**
 * The ClinVar build an assembly is, by its name or any alias: `hg38` and
 * `GRCh38.p14` are GRCh38. Undefined for any other assembly, which NCBI
 * publishes no ClinVar VCF for.
 */
export function clinVarBuild(
  assemblyNames: readonly string[],
): ClinVarBuild | undefined {
  const names = assemblyNames.map(n => n.toLowerCase())
  return CLINVAR_BUILDS.find(build =>
    BUILD_NAMES[build].some(prefix =>
      names.some(n => n === prefix || n.startsWith(`${prefix}.`)),
    ),
  )
}

export function clinVarVcfUrl(build: ClinVarBuild) {
  return `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_${build}/clinvar.vcf.gz`
}

/** NCBI's VCF names chromosomes `1`..`22`, `X`, `Y` and `MT` */
export function clinVarRefName(refName: string) {
  const bare = refName.replace(/^chr/i, '')
  return bare === 'M' ? 'MT' : bare
}

/** A single-base substitution, at its 0-based genome position */
export interface ClinVarSnv {
  start: number
  ref: string
  alt: string
}

const BASE = /^[ACGT]$/

function infoField(info: string, key: string) {
  return new RegExp(`(?:^|;)${key}=([^;]*)`).exec(info)?.[1]
}

/**
 * The substitution a ClinVar VCF line records, when ClinVar's aggregate
 * germline classification calls it pathogenic or likely pathogenic and it is
 * missense on some transcript. `CLNSIG` joins classifications with `/`, `|`
 * and `,` (`Pathogenic/Likely_pathogenic`, `Pathogenic,_low_penetrance`);
 * `Conflicting_classifications_of_pathogenicity` holds no such term, so a
 * conflicted call does not count.
 */
export function parseClinVarSnv(line: string): ClinVarSnv | undefined {
  const [, pos, , ref, alt, , , info = ''] = line.split('\t')
  const significance = infoField(info, 'CLNSIG')?.split(/[/|,]/)
  const consequences = infoField(info, 'MC')?.split(',')
  return pos &&
    ref &&
    alt &&
    BASE.test(ref) &&
    BASE.test(alt) &&
    significance?.some(s => s === 'Pathogenic' || s === 'Likely_pathogenic') &&
    consequences?.some(c => c.endsWith('|missense_variant'))
    ? { start: +pos - 1, ref, alt }
    : undefined
}

const COMPLEMENT: Record<string, string> = { A: 'T', C: 'G', G: 'C', T: 'A' }

/**
 * How many distinct missense substitutions ClinVar calls pathogenic or likely
 * pathogenic at each 0-based residue of a transcript. Each substitution is
 * translated on this transcript's own codon: `p2gCodon` (g2p_mapper's, 0-based)
 * lists a codon's genome positions in reading order, so a codon split by an
 * intron and a minus-strand codon both read right. A variant the VCF calls
 * missense on another transcript but that is synonymous, nonsense or outside
 * the coding sequence of this one does not count, nor does one whose `REF`
 * disagrees with the genome. Two codon changes to one amino acid count once.
 * Every residue with a whole codon gets a count, zero included, so a residue
 * ClinVar has no call for is told apart from one the structure cannot place.
 */
export function pathogenicCountByTranscriptPosition({
  variants,
  p2gCodon,
  strand,
  genomeBase,
  codonTable,
}: {
  variants: Iterable<ClinVarSnv>
  p2gCodon: Record<number, number[]>
  strand: number
  /** the forward-strand base at a 0-based genome position */
  genomeBase: (position: number) => string | undefined
  codonTable: Record<string, string>
}): ReadonlyMap<number, number> {
  const oriented = (base: string | undefined) =>
    base && strand === -1 ? COMPLEMENT[base] : base
  const codons = new Map<number, string[]>()
  const residueAt = new Map<number, { residue: number; index: number }>()
  for (const [residue, positions] of Object.entries(p2gCodon)) {
    const bases = positions.map(p => oriented(genomeBase(p)?.toUpperCase()))
    if (bases.length === 3 && bases.every(b => b !== undefined)) {
      codons.set(+residue, bases)
      positions.forEach((position, index) => {
        residueAt.set(position, { residue: +residue, index })
      })
    }
  }
  const substitutions = new Map<number, Set<string>>()
  for (const { start, ref, alt } of variants) {
    const at = residueAt.get(start)
    const codon = at ? codons.get(at.residue) : undefined
    if (!at || !codon || codon[at.index] !== oriented(ref)) {
      continue
    }
    const mutated = codon.with(at.index, oriented(alt) ?? '')
    const from = codonTable[codon.join('')]
    const to = codonTable[mutated.join('')]
    if (from && to && from !== to && from !== '*' && to !== '*') {
      const seen = substitutions.get(at.residue) ?? new Set()
      seen.add(to)
      substitutions.set(at.residue, seen)
    }
  }
  return new Map(
    [...codons.keys()]
      .toSorted((a, b) => a - b)
      .map(residue => [residue, substitutions.get(residue)?.size ?? 0]),
  )
}
