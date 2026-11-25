/**
 * The oldest JBrowse host the plugin supports: check-host-floor.mjs builds the
 * bundle against what it serves and host-compat-probe.mjs boots the bundle on
 * it. Raising it drops support for every host below it.
 */
export const OLDEST_SUPPORTED_HOST = 'v5.0.0-beta.12'
