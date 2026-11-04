import { SimpleFeature } from '@jbrowse/core/util'
import { getGeneticCode } from '@jbrowse/core/util/geneticCodes'
import { transcriptGeneticCodeId } from '@jbrowse/core/util/translateTranscript'

import { fetchRegionSequence } from '../LaunchProteinView/utils/translateTranscripts'
import { transcriptCodons, translateSnv } from '../ProteinView/clinVar'
import { genomeToTranscriptSeqMapping } from '../mappings'

import type { GenomeHighlight } from '../ProteinView/sessionHighlights'
import type {
  AbstractSessionModel,
  Feature,
  SimpleFeatureSerialized,
} from '@jbrowse/core/util'

/** A launch's `variant`: one genome base, and the substitution there if named */
export interface LaunchVariant {
  text: string
  refName: string
  /** 0-based */
  start: number
  change?: { ref: string; alt: string }
}

export const VARIANT_SPELLING = "'chr17:7674220 C>T' or 'chr17:7674220'"

const VARIANT = /^([^\s:]+):([\d,]+)(?:\s*([ACGT])\s*>\s*([ACGT]))?$/i

/**
 * `chr17:7674220 C>T`: a 1-based position and the forward-strand bases, as a
 * VCF line or HGVS `g.` names a substitution. The change is optional.
 */
export function parseLaunchVariant(text: string): LaunchVariant | undefined {
  const trimmed = text.trim()
  const [, refName, position, ref, alt] = VARIANT.exec(trimmed) ?? []
  const start = position ? Number(position.replaceAll(',', '')) - 1 : -1
  const change =
    ref && alt ? { ref: ref.toUpperCase(), alt: alt.toUpperCase() } : undefined
  return refName && start >= 0 && (!change || change.ref !== change.alt)
    ? { text: trimmed, refName, start, change }
    : undefined
}

/** A variant placed on the transcript's translation */
export interface PlacedLaunchVariant {
  /** 1-based residue of the transcript's translation */
  transcriptResidue: number
  /** R248Q, R248= for a synonymous change, R248* for a nonsense one, and R248
   * for a position alone */
  label: string
}

function proteinChange(from: string, residue: number, to: string | undefined) {
  const after = to === undefined ? '' : to === from ? '=' : to
  return `${from}${residue}${after}`
}

/**
 * The residue a variant changes on the transcript and its protein change.
 * Throws, naming the reason, when the base is not in a whole codon of the
 * transcript's coding sequence, sits in its stop codon, or when the variant's
 * reference base is not the genome's.
 */
export function placeLaunchVariant({
  variant,
  mapping,
  onTranscriptChromosome,
  genomeBase,
  codonTable,
  transcriptName,
}: {
  variant: LaunchVariant
  mapping: { p2gCodon: Record<number, number[]>; strand: number }
  onTranscriptChromosome: boolean
  /** the forward-strand base at a 0-based genome position */
  genomeBase: (position: number) => string | undefined
  codonTable: Record<string, string>
  transcriptName: string
}): PlacedLaunchVariant {
  const codons = transcriptCodons({ ...mapping, genomeBase })
  const site = onTranscriptChromosome ? codons.at(variant.start) : undefined
  const from = site ? codonTable[site.codon.join('')] : undefined
  const { change } = variant
  const result = change
    ? translateSnv(codons, { start: variant.start, ...change }, codonTable)
    : undefined
  if (!site || !from) {
    throw new Error(
      `\`variant\` ${variant.text} is not in the coding sequence of ${transcriptName}`,
    )
  }
  if (from === '*') {
    throw new Error(
      `\`variant\` ${variant.text} is in the stop codon of ${transcriptName}, which no residue stands for`,
    )
  }
  if (change && result?.kind === 'refMismatch') {
    throw new Error(
      `\`variant\` ${variant.text} names ${change.ref} as the reference base, and the genome has ${genomeBase(variant.start)?.toUpperCase()} there`,
    )
  }
  const residue = site.residue + 1
  return {
    transcriptResidue: residue,
    label: proteinChange(
      from,
      residue,
      result?.kind === 'translated' ? result.to : undefined,
    ),
  }
}

function transcriptName(feature: Feature) {
  const name = feature.get('name')
  const id = feature.get('id')
  return name ?? id ?? feature.id()
}

/**
 * A launch's `variant` placed on its transcript, with the labelled genome
 * highlight that marks it: the genome view draws the band, and every
 * structure on the transcript draws the residue under the label.
 */
export async function resolveLaunchVariant({
  session,
  variant,
  feature,
  assemblyName,
}: {
  session: AbstractSessionModel
  variant: LaunchVariant
  feature: SimpleFeatureSerialized | undefined
  assemblyName: string | undefined
}) {
  if (!feature) {
    throw new Error(
      `\`variant\` ${variant.text} is placed through the launch's transcript, and this launch names none; give \`gene\`, \`transcriptId\` or \`feature\``,
    )
  }
  if (!assemblyName) {
    throw new Error(
      `\`variant\` ${variant.text} is highlighted on the connected genome view, and this launch connects none with an assembly`,
    )
  }
  const assembly = await session.assemblyManager.waitForAssembly(assemblyName)
  if (!assembly) {
    throw new Error(`assembly "${assemblyName}" not found`)
  }
  const refName = assembly.getCanonicalRefName(variant.refName)
  if (!refName) {
    throw new Error(
      `\`variant\` ${variant.text} names ${variant.refName}, which ${assemblyName} has no sequence for`,
    )
  }
  const transcript = new SimpleFeature(feature)
  const mapping = genomeToTranscriptSeqMapping(transcript)
  const onTranscriptChromosome =
    assembly.getCanonicalRefName(mapping.refName) === refName
  const residue = onTranscriptChromosome
    ? mapping.g2p[variant.start]
    : undefined
  const span = [
    variant.start,
    ...(residue === undefined ? [] : (mapping.p2gCodon[residue] ?? [])),
  ]
  const start = Math.min(...span)
  const end = Math.max(...span) + 1
  const { seq, assemblyGeneticCodeId } = await fetchRegionSequence({
    session,
    assemblyName,
    refName,
    start,
    end,
  })
  const placed = placeLaunchVariant({
    variant,
    mapping,
    onTranscriptChromosome,
    genomeBase: position => seq?.[position - start],
    codonTable: getGeneticCode(
      transcriptGeneticCodeId(transcript, assemblyGeneticCodeId),
    ).codonTable,
    transcriptName: transcriptName(transcript),
  })
  const highlight: GenomeHighlight = {
    assemblyName,
    refName,
    start: variant.start,
    end: variant.start + 1,
    label: placed.label,
  }
  return { ...placed, highlight }
}
