/**
 * Builds the bundle against what the oldest host it is built for serves, so an
 * import only a newer JBrowse provides fails here rather than as a throw in a
 * reader's browser.
 */
import { fetchHostNames } from '@jbrowse/core/ReExports/hostShim'
import * as esbuild from 'esbuild'

import { esmBuildOptions } from './esmBuildOptions.mjs'
import { OLDEST_SUPPORTED_HOST } from './hostFloor.mjs'

const names = await fetchHostNames(OLDEST_SUPPORTED_HOST)
try {
  await esbuild.build({
    ...esmBuildOptions({ shim: { names, host: OLDEST_SUPPORTED_HOST } }),
    write: false,
    logLevel: 'silent',
  })
  console.log(`builds against ${OLDEST_SUPPORTED_HOST}`)
} catch (error) {
  if (error instanceof Error && 'errors' in error) {
    for (const { text, location } of error.errors) {
      console.error(
        location ? `${location.file}:${location.line}: ${text}` : text,
      )
    }
    console.error(
      `The bundle imports what ${OLDEST_SUPPORTED_HOST} does not serve. Drop the import, or raise OLDEST_SUPPORTED_HOST in scripts/hostFloor.mjs and say which hosts lose the plugin.`,
    )
    process.exit(1)
  } else {
    throw error
  }
}
