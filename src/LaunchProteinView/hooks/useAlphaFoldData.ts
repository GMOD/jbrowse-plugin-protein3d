import useSWR from 'swr'

import { STATIC_SWR_OPTIONS } from './swrOptions'
import useIsoformProteinSequences from './useIsoformProteinSequences'
import {
  fetchAlphaFoldModels,
  pickAlphaFoldModel,
} from '../services/alphaFoldModels'

import type { Feature } from '@jbrowse/core/util'

/** The AlphaFold DB model a launch opens for this gene's accession. */
export default function useAlphaFoldData({
  uniprotId,
  feature,
  view,
}: {
  uniprotId?: string
  feature: Feature
  view?: { assemblyNames?: string[] }
}) {
  const { data, isLoading, isValidating, error } = useSWR(
    uniprotId ? (['alphafold-models', uniprotId] as const) : null,
    ([, id]) => fetchAlphaFoldModels(id),
    { ...STATIC_SWR_OPTIONS, keepPreviousData: true },
  )
  const { isoformSequences } = useIsoformProteinSequences({ feature, view })
  const model = data ? pickAlphaFoldModel(data, isoformSequences) : undefined
  return {
    isLoading,
    isValidating,
    error,
    model,
    noModel: !!uniprotId && !isLoading && !error && data?.length === 0,
  }
}
