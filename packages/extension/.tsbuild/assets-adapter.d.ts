import type { AssetAdapter } from '@h2f/host';
/**
 * The service worker's half of asset resolution.
 *
 * Fetching from the worker rather than from the page is the entire reason the
 * capture engine records URLs instead of bytes: the worker holds
 * `<all_urls>` host permission, so it reads a CDN image that the document
 * itself could never touch without a permissive `Access-Control-Allow-Origin`.
 */
export declare function createAssetAdapter(): AssetAdapter;
//# sourceMappingURL=assets-adapter.d.ts.map