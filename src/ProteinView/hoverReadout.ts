import { codonGenomeSpan, residueNumber, structurePos } from 'p2s_mapper'

import type { CoordinateMapper, Entity } from 'p2s_mapper'

function withSeparators(n: number) {
  return n.toLocaleString('en-US')
}

/**
 * A transcript residue's codon as a 1-based locString on the transcript's own
 * refName, outer bounds included when an intron splits it, with thousands
 * separators as the genome view writes one.
 */
export function codonLocus(
  mapping: { refName: string; p2gCodon: Record<number, number[]> } | undefined,
  transcriptPos: number | undefined,
) {
  if (!mapping || transcriptPos === undefined) {
    return undefined
  }
  const span = codonGenomeSpan(mapping.p2gCodon, transcriptPos)
  return span
    ? `${mapping.refName}:${withSeparators(span[0] + 1)}-${withSeparators(span[1])}`
    : undefined
}

/**
 * The header's readout of the hovered residue as a biologist writes it:
 * `R248 · chain A · chr17:7,674,220-7,674,222`, the structure's letter and
 * author number, then the transcript's residue in parentheses where its letter
 * or number differs, the chain, the codon locus and, when given, the exon. A
 * modified residue (MSE, TPO) shows its parent's letter.
 */
export function hoverReadout({
  hover,
  entity,
  structureToTranscript,
  transcript,
  locus,
  exon,
}: {
  hover: { structureSeqPos?: number; chain?: string }
  entity: Entity | undefined
  structureToTranscript: CoordinateMapper['structureToTranscript'] | undefined
  transcript: string
  locus: string | undefined
  exon?: string
}) {
  const pos = hover.structureSeqPos
  const transcriptPos =
    pos === undefined ? undefined : structureToTranscript?.(structurePos(pos))
  const structureLetter = pos === undefined ? undefined : entity?.seq[pos]
  const genomeLetter =
    transcriptPos === undefined ? undefined : transcript[transcriptPos]
  const residue = pos === undefined ? undefined : residueNumber(entity, pos)
  const transcriptDiffers =
    transcriptPos !== undefined &&
    (transcriptPos + 1 !== residue ||
      (!!genomeLetter && !!structureLetter && genomeLetter !== structureLetter))
  const transcriptResidue = transcriptDiffers
    ? ` (transcript ${genomeLetter ?? ''}${transcriptPos + 1})`
    : ''
  return [
    residue === undefined
      ? undefined
      : `${structureLetter ?? ''}${residue}${transcriptResidue}`,
    hover.chain ? `chain ${hover.chain}` : undefined,
    locus,
    exon,
  ]
    .filter(part => !!part)
    .join(' · ')
}
