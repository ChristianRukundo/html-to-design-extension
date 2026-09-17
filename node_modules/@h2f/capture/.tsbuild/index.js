import { SCHEMA_VERSION } from '@h2f/schema';
import { DEFAULT_PREPARE_OPTIONS, preparePage } from './prepare.js';
import { DEFAULT_WALK_OPTIONS, Walker } from './walk.js';
export { RASTER_ATTRIBUTE } from './walk.js';
export const GENERATOR = `@h2f/capture ${SCHEMA_VERSION}.0`;
/**
 * Capture the current document.
 *
 * Returns a document whose assets are still `PENDING` — resolving those to
 * bytes is the host's job, because only the host can fetch cross-origin URLs
 * and screenshot elements.
 */
export async function capture(options) {
    const prepareOptions = {
        ...DEFAULT_PREPARE_OPTIONS,
        ...pick(options, ['scrollDelay', 'settleDelay', 'hideSelectors']),
    };
    if (!options.skipPrepare) {
        await preparePage(prepareOptions);
    }
    const walkOptions = {
        ...DEFAULT_WALK_OPTIONS,
        ...pick(options, ['autoLayout', 'maxNodes', 'maxDepth']),
    };
    const walker = new Walker(walkOptions);
    const root = walker.walkRoot(options.viewportWidth);
    return {
        version: SCHEMA_VERSION,
        meta: {
            url: location.href,
            title: document.title,
            capturedAt: new Date().toISOString(),
            colorScheme: options.colorScheme ?? detectColorScheme(),
            locale: options.locale ?? document.documentElement.lang ?? navigator.language,
            generator: GENERATOR,
        },
        roots: [root],
        // Cast: assets are PENDING at this point and the host replaces them.
        assets: walker.assets.toJSON(),
        fonts: walker.fontList(),
        warnings: walker.warnings,
    };
}
function detectColorScheme() {
    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    catch {
        return 'light';
    }
}
function pick(source, keys) {
    const out = {};
    for (const key of keys) {
        if (source[key] !== undefined)
            out[key] = source[key];
    }
    return out;
}
//# sourceMappingURL=index.js.map