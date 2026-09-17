import { toBase64 } from './base64.js';
import { decodeDataUrl, decodeUtf8, looksLikeSvg } from './data-url.js';
import { readImageSize } from './image-size.js';
import { pruneMissingAssets } from './prune.js';
/** The only bitmap formats Figma's `createImage` accepts. */
const FIGMA_SAFE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif']);
/**
 * Turn every `PENDING` asset into real bytes.
 *
 * This runs in the host rather than in the page on purpose: `fetch` from inside
 * the document is subject to CORS, and the overwhelming majority of real sites
 * serve their images from a CDN that sends no permissive
 * `Access-Control-Allow-Origin` header. A Playwright request context and an
 * extension service worker are both bound by none of that.
 */
export async function resolveAssets(capture, adapter, options) {
    const warnings = [];
    const assets = capture.assets;
    const pending = Object.entries(assets).filter((entry) => entry[1].kind === 'PENDING');
    const concurrency = Math.max(1, options.concurrency ?? 8);
    let cursor = 0;
    let done = 0;
    const workers = Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
        while (cursor < pending.length) {
            const index = cursor++;
            const [ref, asset] = pending[index];
            // Raster placeholders are filled in by the screenshot pass, not here.
            if (asset.url === '') {
                done++;
                continue;
            }
            try {
                const resolved = await resolveOne(asset, adapter, options);
                if (resolved) {
                    assets[ref] = resolved;
                }
                else {
                    delete assets[ref];
                    warnings.push({
                        code: 'asset.unreadable',
                        message: `Could not decode image: ${short(asset.url)}`,
                    });
                }
            }
            catch (error) {
                delete assets[ref];
                warnings.push({
                    code: 'asset.failed',
                    message: `Could not fetch ${short(asset.url)}: ${error.message}`,
                });
            }
            options.onProgress?.(++done, pending.length);
        }
    });
    await Promise.all(workers);
    // Any node still pointing at a dropped asset would fail validation, so the
    // references are pruned rather than left dangling.
    pruneMissingAssets(capture, warnings);
    return warnings;
}
/** Number of assets `resolveAssets` would have to fetch, for progress reporting. */
export function countPendingAssets(capture) {
    return Object.values(capture.assets).filter((asset) => asset.kind === 'PENDING' && asset.url !== '').length;
}
async function resolveOne(asset, adapter, options) {
    const { bytes, contentType } = asset.url.startsWith('data:')
        ? decodeDataUrl(asset.url)
        : await adapter.fetchBytes(asset.url);
    if (bytes.length === 0)
        return null;
    // SVG stays vector all the way into Figma; rasterizing it here would throw
    // away the one asset type that imports as editable shapes.
    if (contentType.includes('svg') || looksLikeSvg(bytes)) {
        return {
            kind: 'SVG',
            markup: decodeUtf8(bytes),
            width: asset.width || 0,
            height: asset.height || 0,
            source: asset.url,
        };
    }
    const header = readImageSize(bytes);
    const needsProbe = header === null;
    const tooLarge = header !== null && Math.max(header.width, header.height) > options.maxImageDim;
    // A parseable header is not enough: Figma's `createImage` takes PNG, JPEG
    // and GIF and nothing else, so WebP and BMP go to the adapter to come back
    // as PNG rather than being embedded as bytes the plugin cannot use.
    const unsupported = header !== null && !FIGMA_SAFE_TYPES.has(header.mimeType);
    if (!needsProbe && !tooLarge && !unsupported) {
        return {
            kind: 'BITMAP',
            bytes: toBase64(bytes),
            mimeType: header.mimeType,
            width: header.width,
            height: header.height,
            source: asset.url,
        };
    }
    const decoded = await adapter.decodeImage(bytes, contentType || header?.mimeType || '', options.maxImageDim, !needsProbe && !unsupported);
    if (!decoded)
        return null;
    return {
        kind: 'BITMAP',
        bytes: toBase64(decoded.bytes),
        mimeType: decoded.mimeType,
        width: decoded.width,
        height: decoded.height,
        source: asset.url,
    };
}
function short(url) {
    return url.length > 80 ? `${url.slice(0, 77)}…` : url;
}
//# sourceMappingURL=resolve-assets.js.map