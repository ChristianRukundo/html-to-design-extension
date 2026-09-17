import type { Asset, AssetRef, PendingAsset } from '@h2f/schema';
/**
 * Collects every image the page references, deduplicated.
 *
 * The capture deliberately never downloads bytes. It records resolved URLs and
 * lets the host — the CLI in Node today, the extension's service worker later —
 * fetch them, which sidesteps CORS entirely and keeps this bundle free of any
 * async network work that could hang the walk.
 */
export declare class AssetRegistry {
    private readonly byKey;
    private readonly entries;
    private counter;
    /** Register a URL to be fetched by the host. */
    addPending(url: string, width: number, height: number): AssetRef | null;
    /** Register inline SVG markup, which needs no fetching. */
    addSvg(markup: string, width: number, height: number): AssetRef;
    /**
     * Reserve a slot for an element the host must screenshot. The host fills in
     * the bytes; until then it is a placeholder keyed by node id.
     */
    addRasterPlaceholder(nodeId: string, width: number, height: number): AssetRef;
    toJSON(): Record<AssetRef, Asset | PendingAsset>;
    /**
     * The same URL is often referenced at several display sizes (an `<img>` and a
     * CSS background, say). Keep the largest so the host fetches once at a
     * resolution that satisfies every use.
     */
    private growPending;
    private nextRef;
}
/** Resolve a possibly relative URL against the document, dropping unusable ones. */
export declare function resolveUrl(url: string): string | null;
//# sourceMappingURL=assets.d.ts.map