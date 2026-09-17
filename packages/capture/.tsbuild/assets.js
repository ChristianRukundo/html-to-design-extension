/**
 * Collects every image the page references, deduplicated.
 *
 * The capture deliberately never downloads bytes. It records resolved URLs and
 * lets the host — the CLI in Node today, the extension's service worker later —
 * fetch them, which sidesteps CORS entirely and keeps this bundle free of any
 * async network work that could hang the walk.
 */
export class AssetRegistry {
    constructor() {
        this.byKey = new Map();
        this.entries = new Map();
        this.counter = 0;
    }
    /** Register a URL to be fetched by the host. */
    addPending(url, width, height) {
        const absolute = resolveUrl(url);
        if (!absolute)
            return null;
        // A data URI is already the bytes; hand it over directly so the host does
        // not have to round-trip it through the network stack.
        const existing = this.byKey.get(absolute);
        if (existing) {
            this.growPending(existing, width, height);
            return existing;
        }
        const ref = this.nextRef('img');
        this.byKey.set(absolute, ref);
        this.entries.set(ref, { kind: 'PENDING', url: absolute, width, height });
        return ref;
    }
    /** Register inline SVG markup, which needs no fetching. */
    addSvg(markup, width, height) {
        const key = `svg:${markup}`;
        const existing = this.byKey.get(key);
        if (existing)
            return existing;
        const ref = this.nextRef('svg');
        this.byKey.set(key, ref);
        this.entries.set(ref, { kind: 'SVG', markup, width, height });
        return ref;
    }
    /**
     * Reserve a slot for an element the host must screenshot. The host fills in
     * the bytes; until then it is a placeholder keyed by node id.
     */
    addRasterPlaceholder(nodeId, width, height) {
        const ref = `raster:${nodeId}`;
        this.entries.set(ref, { kind: 'PENDING', url: '', width, height });
        return ref;
    }
    toJSON() {
        return Object.fromEntries(this.entries);
    }
    /**
     * The same URL is often referenced at several display sizes (an `<img>` and a
     * CSS background, say). Keep the largest so the host fetches once at a
     * resolution that satisfies every use.
     */
    growPending(ref, width, height) {
        const entry = this.entries.get(ref);
        if (entry?.kind !== 'PENDING')
            return;
        entry.width = Math.max(entry.width, width);
        entry.height = Math.max(entry.height, height);
    }
    nextRef(prefix) {
        return `${prefix}:${this.counter++}`;
    }
}
/** Resolve a possibly relative URL against the document, dropping unusable ones. */
export function resolveUrl(url) {
    const trimmed = url
        .trim()
        .replace(/^url\((.*)\)$/i, '$1')
        .replace(/^["']|["']$/g, '');
    if (trimmed === '' || trimmed === 'none' || trimmed.startsWith('#'))
        return null;
    // `blob:` URLs are revoked when the page unloads, so the host would fetch a
    // dead reference. They have to be read while the page is alive, which the
    // walker does not do; dropping them is honest.
    if (trimmed.startsWith('blob:'))
        return null;
    try {
        return new URL(trimmed, document.baseURI).href;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=assets.js.map