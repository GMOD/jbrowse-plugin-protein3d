// Keeps .test-jbrowse-nightly actually nightly.
//
// `pretest` used to be `test -d .test-jbrowse-nightly || jbrowse create …`,
// which creates the directory once and then never touches it again. CI fetches
// a fresh nightly on every run, so the two drift apart silently: a local copy
// two months stale passed the e2e while CI failed on the same commit, because
// jbrowse-components had moved the track paint signal in between. The local
// suite was, in effect, testing a host nobody ships.
//
// So refresh when the copy is older than MAX_AGE_DAYS. Not on every run —
// that's a ~100MB download — and never in CI, which does its own fresh create.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), '.test-jbrowse-nightly')
const MAX_AGE_DAYS = 7
const STAMP = path.join(DIR, '.fetched')

// Not the directory's own mtime: the e2e recreates plugin/ inside it on every
// run, which kept a copy of any age looking minutes old. A copy fetched before
// the stamp existed is dated by index.html, which carries the build's time.
function ageInDays() {
  const dated =
    [STAMP, path.join(DIR, 'index.html')].find(f => fs.existsSync(f)) ?? DIR
  return (Date.now() - fs.statSync(dated).mtimeMs) / (24 * 60 * 60 * 1000)
}

const exists = fs.existsSync(DIR)
if (exists && process.env.CI) {
  // CI created it moments ago; re-downloading would only add flake
  process.exit(0)
}

const stale = exists && ageInDays() > MAX_AGE_DAYS
if (exists && !stale) {
  console.log(
    `.test-jbrowse-nightly is ${ageInDays().toFixed(1)} days old, keeping it`,
  )
  process.exit(0)
}

console.log(
  exists
    ? `.test-jbrowse-nightly is ${ageInDays().toFixed(1)} days old (>${MAX_AGE_DAYS}), refreshing`
    : 'creating .test-jbrowse-nightly',
)

// Fetch beside the live directory and swap, so an interrupted or failed
// download leaves the working copy intact rather than deleting it.
const TMP = `${DIR}.new`
fs.rmSync(TMP, { recursive: true, force: true })
try {
  // `npx jbrowse` resolves a package *named* jbrowse, which exists on npm and
  // carries no such binary, so this only ever worked where a global install had
  // already put `jbrowse` on PATH — as CI does. From a fresh checkout it failed
  // with "could not determine executable to run" and no nightly at all. Name
  // the package that owns the binary, as msaview's pretest does.
  execFileSync('npx', ['-y', '@jbrowse/cli', 'create', TMP, '--nightly'], {
    stdio: 'inherit',
    timeout: 600_000,
  })
} catch (e) {
  fs.rmSync(TMP, { recursive: true, force: true })
  if (exists) {
    console.warn(
      `could not refresh .test-jbrowse-nightly (${e.message}); using the existing copy`,
    )
    process.exit(0)
  }
  throw e
}
fs.rmSync(DIR, { recursive: true, force: true })
fs.renameSync(TMP, DIR)
fs.writeFileSync(STAMP, '')
console.log('.test-jbrowse-nightly refreshed')
