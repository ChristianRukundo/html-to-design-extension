/**
 * Messages between the three contexts the extension runs in.
 *
 * The popup is the only one a user sees and the only one that can disappear
 * mid-run — Chrome tears it down the moment focus leaves it. So the popup owns
 * no state: it connects, renders whatever the worker reports, and can be closed
 * and reopened at any point during a capture without affecting it.
 */
export const DEFAULT_SETTINGS = {
    autoLayout: true,
    hideSelectors: [],
    compress: false,
    maxImageDim: 4096,
    concurrency: 8,
    viewports: [0],
};
export const PHASE_LABELS = {
    preparing: 'Loading the whole page',
    walking: 'Reading the DOM',
    rasterizing: 'Screenshotting what Figma cannot draw',
    assets: 'Downloading images',
    writing: 'Writing the capture file',
};
export const CHUNK_SIZE = 4000000;
//# sourceMappingURL=protocol.js.map