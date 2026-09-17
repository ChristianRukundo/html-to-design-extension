/**
 * The intermediate representation (IR) exchanged between the capture side
 * (browser) and the Figma plugin.
 *
 * Design rules for anything added here:
 *
 *  1. Plain JSON only. The whole document round-trips through `JSON.stringify`
 *     and through Figma's `postMessage` structured clone.
 *  2. No Figma vocabulary. The capture side must never need to know what a
 *     `SolidPaint` is; all Figma-specific mapping lives in `@h2f/plugin`.
 *  3. No CSS vocabulary either, where it can be avoided. Values are resolved,
 *     absolute and unit-less (pixels, degrees, 0..1 ratios) so the plugin never
 *     has to parse a string.
 */
/** Bumped whenever a change makes older capture files unreadable. */
export const SCHEMA_VERSION = 1;
//# sourceMappingURL=types.js.map