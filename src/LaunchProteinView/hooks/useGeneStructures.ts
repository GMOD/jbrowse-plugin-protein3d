import { useMemo } from 'react'

import { errorMessage } from '../../ProteinView/util'
import { datasetRow, listOrder, structureRows } from '../utils/structureList'
import { useAlphaFoldComplexes } from './useAlphaFoldComplexes'
import useAlphaFoldData from './useAlphaFoldData'
import useDatasetStructures from './useDatasetStructures'
import useExperimentalStructures from './useExperimentalStructures'
import usePdbEntrySummaries from './usePdbEntrySummaries'

import type { StructureSection } from '../utils/structureList'
import type { Feature } from '@jbrowse/core/util'

/** A line under a section; a failed request's offers to ask again */
export interface SectionNotice {
  message: string
  retry?: () => void
  retrying?: boolean
}

export interface SectionStatus {
  loading: string[]
  notices: SectionNotice[]
}

interface StatusLine {
  sections: readonly StructureSection[]
  loading?: string | false
  notice?: string | false
  retry?: () => void
  retrying?: boolean
}

function isText(value: string | false | undefined) {
  return typeof value === 'string'
}

function sectionStatus(
  lines: StatusLine[],
): Record<StructureSection, SectionStatus> {
  const of = (section: StructureSection) => {
    const mine = lines.filter(l => l.sections.includes(section))
    return {
      loading: mine.map(l => l.loading).filter(isText),
      notices: mine.flatMap(({ notice, retry, retrying }) =>
        typeof notice === 'string'
          ? [{ message: notice, retry, retrying }]
          : [],
      ),
    }
  }
  return {
    added: of('added'),
    alone: of('alone'),
    partner: of('partner'),
    fragment: of('fragment'),
  }
}

/**
 * Every structure of the gene's protein, from the site's own datasets,
 * AlphaFold DB's models and complexes and RCSB's entries, each source loading
 * and failing on its own: what one source has found is listed while another
 * is still asking, and a source that fails leaves a line in the sections it
 * would have filled. A dataset lists its structures by the gene's own ids, so
 * they need no UniProt accession.
 */
export default function useGeneStructures({
  jbrowse,
  uniprotId,
  uniprotPending,
  geneName,
  feature,
  view,
  preferredTranscriptId,
}: {
  /** the session's config, `session.jbrowse`, which names the datasets */
  jbrowse: object
  uniprotId?: string
  /** the accession is still being looked up */
  uniprotPending: boolean
  geneName: string
  feature: Feature
  view?: { assemblyNames?: string[] }
  preferredTranscriptId?: string
}) {
  const datasets = useDatasetStructures({
    jbrowse,
    feature,
    preferredTranscriptId,
  })
  const alphaFold = useAlphaFoldData({
    uniprotId,
    feature,
    view,
    preferredTranscriptId,
  })
  const complexes = useAlphaFoldComplexes(uniprotId)
  const experimental = useExperimentalStructures(uniprotId)
  const summaries = usePdbEntrySummaries(
    experimental.entries?.map(e => e.pdbId),
  )

  const entries = experimental.entries
  // A row's section waits on its partners, so entries are listed once RCSB has
  // described them, or failed to, rather than jumping between sections
  const entriesReady =
    !!entries && (entries.length === 0 || !summaries.isLoading)
  const uniprotLength =
    alphaFold.entryLength ??
    alphaFold.model?.sequence?.length ??
    Math.max(1, ...(entries ?? []).map(e => e.end))

  const rows = useMemo(
    () =>
      listOrder([
        ...datasets.matches.map(match =>
          datasetRow({ match, geneName, uniprotLength }),
        ),
        ...(uniprotId
          ? structureRows({
              geneName,
              uniprotId,
              uniprotLength,
              alphaFold: alphaFold.isLoading ? undefined : alphaFold.model,
              entries: entriesReady ? entries : undefined,
              summaries: summaries.summaries,
              complexes: complexes.complexes,
            })
          : []),
      ]),
    [
      datasets.matches,
      uniprotId,
      geneName,
      uniprotLength,
      alphaFold.isLoading,
      alphaFold.model,
      entriesReady,
      entries,
      summaries.summaries,
      complexes.complexes,
    ],
  )

  const pdb = ['alone', 'partner', 'fragment'] as const
  const datasetLines: StatusLine[] = [
    {
      sections: ['alone'],
      loading: datasets.isLoading && datasets.loadingMessage,
    },
    ...datasets.notices.map(notice => ({
      sections: ['alone'] as const,
      notice,
      retry: datasets.retry,
      retrying: datasets.retrying,
    })),
  ]
  // a request asked again is loading, and its old failure stops being news
  const modelsUnreachable =
    !alphaFold.isLoading && alphaFold.modelsUnreachable !== undefined
  const uniprotLines: StatusLine[] = uniprotId
    ? [
        {
          sections: ['alone'],
          loading: alphaFold.isLoading && 'Asking AlphaFold DB for models',
          notice: alphaFold.noModel
            ? `AlphaFold DB has no model for ${uniprotId}`
            : modelsUnreachable &&
              `AlphaFold DB's model list did not answer, so its row opens the canonical model file for ${uniprotId}, without comparing its sequence to the isoforms`,
          retry: modelsUnreachable ? alphaFold.retry : undefined,
        },
        {
          sections: pdb,
          loading:
            (experimental.isLoading || summaries.isLoading) &&
            'Listing PDB entries from RCSB',
          notice:
            !experimental.isLoading &&
            experimental.error !== undefined &&
            `RCSB did not list the PDB entries: ${errorMessage(experimental.error)}`,
          retry: experimental.retry,
        },
        {
          sections: ['alone', 'partner'],
          notice:
            !summaries.isLoading &&
            summaries.error !== undefined &&
            `RCSB did not describe the PDB entries, so they are placed by coverage alone: ${errorMessage(summaries.error)}`,
          retry: summaries.retry,
        },
        {
          sections: ['alone'],
          notice:
            entries?.length === 0 &&
            `RCSB lists no experimental structure for ${uniprotId}`,
        },
        {
          sections: ['partner'],
          loading:
            complexes.isLoading &&
            'Asking AlphaFold DB for predicted complexes',
          notice:
            !complexes.isLoading &&
            complexes.error !== undefined &&
            `AlphaFold DB's complex list did not answer: ${errorMessage(complexes.error)}`,
          retry: complexes.retry,
        },
      ]
    : []
  const sections = sectionStatus([...datasetLines, ...uniprotLines])

  const hasDatasetRow = datasets.matches.length > 0
  return {
    rows,
    uniprotLength,
    sections,
    // the default pick is a dataset's structure, else the AlphaFold model,
    // else the first row listed, so it is known once the datasets have loaded
    // and listed one, or AlphaFold DB has answered, or everything has
    defaultSettled:
      !datasets.isLoading &&
      (hasDatasetRow ||
        (!uniprotPending &&
          !alphaFold.isLoading &&
          (!!alphaFold.model ||
            !(
              experimental.isLoading ||
              summaries.isLoading ||
              complexes.isLoading
            )))),
  }
}
