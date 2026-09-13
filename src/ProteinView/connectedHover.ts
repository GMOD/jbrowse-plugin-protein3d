import { genomeHoverToTranscriptPos } from './util'

import type { Region } from '@jbrowse/core/util/types'

interface SessionView {
  id: string
  type: string
  connectedViewId?: string
}

/** The part of jbrowse-plugin-msaview's MsaView model read here. */
interface MsaViewLike extends SessionView {
  /** Genome regions (a codon) under the alignment column the pointer is on,
   * through the MSA's own link to the transcript. */
  connectedHoverHighlights?: Region[]
}

/**
 * The transcript residue a pointer elsewhere in the session is on: the genome
 * view's hover first, else the hovered column of an alignment connected to the
 * same genome view. msaview pairs with a structure by that shared genome view
 * too, so the link holds in both directions without either view naming the
 * other.
 *
 * The alignment is read as the codon msaview maps its column to, never as a
 * column number. The genome is the one coordinate the two plugins share, so
 * this holds for any alignment whose query row is linked to the transcript: a
 * Pfam seed row cut to one domain, or a structure covering a fragment. The
 * column-number bridge this replaced assumed the structure's sequence was an
 * alignment row, and where none matched it took the column for a residue
 * index: hovering R248 in a TP53 session with PF00870's seed lit a second codon
 * 400 bp away.
 */
export function connectedHoverTranscriptPos({
  hovered,
  views,
  mapping,
  connectedViewId,
  genomeViewReady,
}: {
  hovered: unknown
  views: MsaViewLike[]
  mapping: { g2p: Record<number, number>; refName: string } | undefined
  connectedViewId: string | undefined
  genomeViewReady: boolean
}): { transcriptPos: number; source: 'genome' | 'msa' } | undefined {
  const fromGenome = genomeViewReady
    ? genomeHoverToTranscriptPos(hovered, mapping)
    : undefined
  if (fromGenome !== undefined) {
    return { transcriptPos: fromGenome, source: 'genome' }
  }
  const codon = connectedViewId
    ? views.find(
        v => v.type === 'MsaView' && v.connectedViewId === connectedViewId,
      )?.connectedHoverHighlights?.[0]
    : undefined
  const fromMsa =
    mapping && codon?.refName === mapping.refName
      ? mapping.g2p[codon.start]
      : undefined
  return fromMsa === undefined
    ? undefined
    : { transcriptPos: fromMsa, source: 'msa' }
}
