/**
 * Combine per-viewport captures into a single document.
 *
 * Each capture numbers its nodes and assets from zero, so they are namespaced
 * before merging. Without that, the 1920px and 390px roots would both contain a
 * node called `n0` pointing at an asset called `img:0`, and the second capture
 * would silently overwrite the first.
 */
export function mergeCaptures(captures) {
    if (captures.length === 0)
        throw new Error('nothing to merge');
    if (captures.length === 1)
        return captures[0];
    const base = captures[0];
    const merged = {
        version: base.version,
        meta: base.meta,
        roots: [],
        assets: {},
        fonts: [],
        warnings: [],
    };
    const fontKeys = new Set();
    const warningKeys = new Set();
    captures.forEach((capture, index) => {
        const prefix = `v${index}_`;
        for (const [ref, asset] of Object.entries(capture.assets)) {
            merged.assets[prefix + ref] = asset;
        }
        for (const root of capture.roots) {
            merged.roots.push(namespaceNode(root, prefix));
        }
        for (const font of capture.fonts) {
            const key = `${font.family}|${font.weight}|${font.italic}`;
            if (fontKeys.has(key))
                continue;
            fontKeys.add(key);
            merged.fonts.push(font);
        }
        // The same approximation reported at three viewports is one problem, not
        // three; deduplicating keeps the plugin's warning panel readable.
        for (const warning of capture.warnings) {
            const key = `${warning.code}|${warning.nodeName ?? ''}`;
            if (warningKeys.has(key))
                continue;
            warningKeys.add(key);
            merged.warnings.push(warning);
        }
    });
    return merged;
}
function namespaceNode(node, prefix) {
    const next = { ...node, id: prefix + node.id };
    if ('asset' in next && typeof next.asset === 'string') {
        next.asset = prefix + next.asset;
    }
    if ('rasterize' in next && typeof next.rasterize === 'string') {
        next.rasterize = prefix + next.rasterize;
    }
    if ('fills' in next && Array.isArray(next.fills)) {
        next.fills = next.fills.map((paint) => paint.kind === 'IMAGE' ? { ...paint, asset: prefix + paint.asset } : paint);
    }
    if ('children' in next && Array.isArray(next.children)) {
        next.children = next.children.map((child) => namespaceNode(child, prefix));
    }
    return next;
}
//# sourceMappingURL=merge.js.map