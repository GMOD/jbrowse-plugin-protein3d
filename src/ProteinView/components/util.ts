export async function loadStructure({
  url,
  file,
  plugin,
}: {
  url?: string
  file?: { type: string; filestring: string }
  plugin?: {
    clear: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
}) {
  if (!plugin) {
    return
  }
  plugin.clear()
  console.log('wow clear')
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
      ext = ext.slice(0, Math.max(0, ext.indexOf('?')))
    }
    console.log({ ext, data })
    const traj = await plugin.builders.structure.parseTrajectory(data, ext)
    await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
  }
}
