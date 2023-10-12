import { PluginContext } from 'molstar/lib/mol-plugin/context'

export async function loadStructure({
  url,
  file,
  plugin,
}: {
  url?: string
  file?: { type: string; filestring: string }
  plugin?: PluginContext
}) {
  if (!plugin) {
    return
  }
  await plugin.clear()
  if (file) {
    const { filestring, type } = file
    const data = await plugin.builders.data.rawData({
      data: filestring,
    })
    // @ts-expect-error
    const traj = await plugin.builders.structure.parseTrajectory(data, type)
    await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
  } else {
    const structureUrl = url
    if (!structureUrl) {
      return
    }
    const data = await plugin.builders.data.download(
      { url: structureUrl },
      { state: { isGhost: true } },
    )
    let ext = structureUrl.split('.').pop()?.replace('cif', 'mmcif')
    if (ext?.includes('?')) {
      ext = ext.slice(0, Math.max(0, ext.indexOf('?')))
    }
    // @ts-expect-error
    const traj = await plugin.builders.structure.parseTrajectory(data, ext)
    await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
  }
}
