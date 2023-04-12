export async function loadStructure({
  url,
  file,
  plugin,
}: {
  url?: string
  file?: { type: string; filestring: string }
  plugin?: { clear: () => void; [key: string]: any }
}) {
  if (!plugin) {
    return
  }
  plugin.clear()
  if (file) {
    const { filestring, type } = file
    const data = await plugin.builders.data.rawData({
      data: filestring,
    })
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
      ext = ext.substring(0, ext.indexOf('?'))
    }
    const traj = await plugin.builders.structure.parseTrajectory(data, ext)
    await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
  }
}
