import type { Capture, Warning } from '@h2f/schema';
import { type RawBytes } from './data-url.js';
export interface DecodedImage {
    bytes: Uint8Array;
    mimeType: string;
    width: number;
    height: number;
}
/**
 * The two things only the host platform can do.
 *
 * Everything else about resolving assets — which ones to fetch, in what order,
 * what counts as an SVG, what happens when one fails — is identical whether the
 * host is Playwright in Node or a service worker in Chrome, and lives below.
 */
export interface AssetAdapter {
    /** Fetch a URL with the page's credentials, unconstrained by CORS. */
    fetchBytes(url: string): Promise<RawBytes>;
    /**
     * Decode an image, downscaling it to fit `maxDim`. Called for formats
     * `readImageSize` cannot parse, formats Figma's `createImage` rejects
     * (WebP, AVIF, BMP, …) and images that exceed the limit.
     *
     * When `allowOriginal` is false the original bytes must not be returned
     * even if no downscaling was needed — the caller knows Figma would reject
     * them, so they have to be re-encoded (PNG). Returns `null` when the bytes
     * are not a decodable image.
     */
    decodeImage(bytes: Uint8Array, contentType: string, maxDim: number, allowOriginal: boolean): Promise<DecodedImage | null>;
}
export interface ResolveOptions {
    maxImageDim: number;
    /** Enough to hide latency, not enough to get throttled. */
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
}
/**
 * Turn every `PENDING` asset into real bytes.
 *
 * This runs in the host rather than in the page on purpose: `fetch` from inside
 * the document is subject to CORS, and the overwhelming majority of real sites
 * serve their images from a CDN that sends no permissive
 * `Access-Control-Allow-Origin` header. A Playwright request context and an
 * extension service worker are both bound by none of that.
 */
export declare function resolveAssets(capture: Capture, adapter: AssetAdapter, options: ResolveOptions): Promise<Warning[]>;
/** Number of assets `resolveAssets` would have to fetch, for progress reporting. */
export declare function countPendingAssets(capture: Capture): number;
//# sourceMappingURL=resolve-assets.d.ts.map