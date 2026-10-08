import { getConf } from '@jbrowse/core/configuration'
import {
  fetchAlphaFoldModels,
  getAlphaFoldStructureUrl,
  pickAlphaFoldModel,
  searchUniProtEntries,
} from 'p2s_mapper'

import { codingTranscripts } from './codingFeature'
import { rankIsoforms } from '../AlignTranscriptRpc'
import { fetchTranscriptProteinSeqs } from './utils/translateTranscripts'
import { extractFeatureIdentifiers, extractTaxonId } from './utils/util'
import { alignOffThread } from '../ProteinView/alignOffThread'

import type { IsoformRanking } from '../AlignTranscriptRpc'
import type { TranscriptTranslation } from './utils/translateTranscripts'
import type { AbstractSessionModel, Feature } from '@jbrowse/core/util'
import type { Isoform, UniProtEntry } from 'p2s_mapper'

export interface GeneLaunch {
  transcript: Feature
  userProvidedTranscriptSequence: string
  /** undefined when the gene's identifiers name no single UniProt entry */
  uniprotId?: string
  /** the AlphaFold model of that entry; undefined when it has none */
  url?: string
}

/**
 * The entry a search names without a person choosing: the only hit, or the
 * only reviewed one. A gene-name search answers with the Swiss-Prot entry and
 * a tail of TrEMBL fragments, so the first row alone would also be right for
 * most human genes, and wrong in silence for the rest.
 */
export function unambiguousEntry(entries: UniProtEntry[]) {
  const reviewed = entries.filter(e => e.isReviewed)
  return entries.length === 1
    ? entries[0]
    : reviewed.length === 1
      ? reviewed[0]
      : undefined
}

/** What resolving a gene asks of the session and the network. */
export interface GeneLaunchHost {
  translate: (transcripts: Feature[]) => Promise<TranscriptTranslation[]>
  taxonId: () => Promise<number | undefined>
  rankIsoforms: (
    isoforms: Isoform[],
    structureSequences: string[],
  ) => Promise<IsoformRanking>
  searchUniProtEntries: typeof searchUniProtEntries
  fetchAlphaFoldModels: typeof fetchAlphaFoldModels
}

export function sessionGeneLaunchHost(
  session: AbstractSessionModel,
  assemblyName: string,
): GeneLaunchHost {
  return {
    translate: transcripts =>
      fetchTranscriptProteinSeqs({ transcripts, session, assemblyName }),
    taxonId: async () => {
      const assembly =
        await session.assemblyManager.waitForAssembly(assemblyName)
      return assembly
        ? extractTaxonId(getConf(assembly, ['sequence', 'metadata']))
        : undefined
    },
    rankIsoforms: (isoforms, structureSequences) =>
      alignOffThread({
        rpcManager: session.rpcManager,
        name: 'ProteinRankIsoforms',
        args: { isoforms, structureSequences },
        inPlace: () => rankIsoforms(isoforms, structureSequences),
      }),
    searchUniProtEntries,
    fetchAlphaFoldModels,
  }
}

/**
 * Everything the launch dialog works out from a gene, without the dialog: the
 * UniProt entry from the feature's identifiers, the AlphaFold model of that
 * entry, and the isoform to map — the preferred one when it translates, else
 * the one the model was folded from, else the longest.
 */
export async function resolveGeneLaunch({
  host,
  feature,
  preferredTranscriptId,
  uniprotId: givenUniprotId,
}: {
  host: GeneLaunchHost
  feature: Feature
  preferredTranscriptId?: string
  uniprotId?: string
}): Promise<GeneLaunch> {
  const ids = extractFeatureIdentifiers(feature, preferredTranscriptId)
  const [translations, uniprotId] = await Promise.all([
    host.translate(codingTranscripts(feature)),
    givenUniprotId ??
      ids.uniprotId ??
      (ids.recognizedIds.length > 0 || ids.geneName
        ? host.taxonId().then(
            async organismId =>
              unambiguousEntry(
                (
                  await host.searchUniProtEntries({
                    recognizedIds: ids.recognizedIds,
                    geneId: ids.geneId,
                    geneName: ids.geneName,
                    organismId,
                  })
                ).entries,
              )?.accession,
          )
        : undefined),
  ])
  const translated = translations.flatMap(({ feature: transcript, seq }) =>
    seq ? [{ transcript, seq }] : [],
  )
  if (translated.length === 0) {
    throw new Error('none of the transcripts could be translated')
  }
  const isoforms: Isoform[] = translated.map(t => ({
    id: t.transcript.id(),
    seq: t.seq,
  }))

  // An unreachable API says nothing about the accession, so the spelled
  // canonical filename is worth a try; an API answering with no models has
  // said there is nothing to open. The structure loader draws the same line.
  const models = uniprotId
    ? await host.fetchAlphaFoldModels(uniprotId).catch(() => undefined)
    : []
  const model = models
    ? pickAlphaFoldModel(
        models,
        Object.fromEntries(isoforms.map(i => [i.id, { seq: i.seq ?? '' }])),
      )
    : undefined
  const url =
    uniprotId && models === undefined
      ? getAlphaFoldStructureUrl(uniprotId)
      : model?.url

  const structureSequences = model ? [model.sequence] : []
  const preferred = translated.find(
    t => t.transcript.id() === preferredTranscriptId,
  )
  const ranking = preferred
    ? undefined
    : structureSequences.length > 0
      ? (await host.rankIsoforms(isoforms, structureSequences)).ranking
      : rankIsoforms(isoforms).ranking
  const bestId = ranking && (ranking.matches[0] ?? ranking.nonMatches[0])?.id
  const chosen =
    preferred ??
    translated.find(t => t.transcript.id() === bestId) ??
    translated[0]!

  return {
    transcript: chosen.transcript,
    userProvidedTranscriptSequence: chosen.seq,
    uniprotId,
    url,
  }
}
