import globals from '@jbrowse/core/ReExports/list'
import { createRollupConfig } from '@jbrowse/development-tools'
import replace from '@rollup/plugin-replace'

function stringToBoolean(string) {
  return string === undefined ? string : JSON.parse(string)
}

const includeUMD = stringToBoolean(process.env.JB_UMD)
const includeCJS = stringToBoolean(process.env.JB_CJS)
const includeESMBundle = stringToBoolean(process.env.JB_ESM_BUNDLE)
const includeNPM = stringToBoolean(process.env.JB_NPM)

const r = createRollupConfig(globals.default, {
  includeUMD,
  includeCJS,
  includeESMBundle,
  includeNPM,
})[0]

const config = {
  ...r,
  output: r.output[0],
  plugins: [
    ...r.plugins,
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    }),
  ],
}

export default config
