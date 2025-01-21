import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { StructureRepresentationPresetProvider } from 'molstar/lib/mol-plugin-state/builder/structure/representation-preset'
import { type BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory'

export interface LoadStructureOptions {
  representationParams?: StructureRepresentationPresetProvider.CommonParams
}

// adapted from https://github.com/molstar/molstar/blob/ab4130d42d0ab2591f62460292ade0203207d4d2/src/apps/viewer/app.ts#L255C1-L259C6
export async function addStructureFromData({
  data,
  format = 'pdb',
  options,
  plugin,
}: {
  data: string
  format?: BuiltInTrajectoryFormat
  options?: LoadStructureOptions & { label?: string; dataLabel?: string }
  plugin: PluginContext
}) {
  const _data = await plugin.builders.data.rawData({
    data,
    label: options?.dataLabel,
  })

  const trajectory = await plugin.builders.structure.parseTrajectory(
    _data,
    format,
  )
  const model = await plugin.builders.structure.createModel(trajectory)

  await plugin.builders.structure.hierarchy.applyPreset(
    trajectory,
    'all-models',
    {
      useDefaultIfSingleModel: true,
      representationPresetParams: options?.representationParams,
    },
  )

  return { model }
}
