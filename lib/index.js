/**
 * Host half of dsh-market-sidebar.
 *
 * The whole feature lives in the client half (`./client`, see lib/client.js):
 * it registers a `sidebar.footer.action` entry that opens the dsh-market panel
 * through the `market` service the market itself publishes.
 *
 * This half only has to exist and stay harmless, because a profile bundle is
 * mounted on the host before its client half is served to the browser. Keeping
 * `apply` empty is deliberate: nothing here may throw, or the host refuses to
 * start the whole profile.
 */

export const name = 'dsh-market-sidebar'

export function apply() {}
