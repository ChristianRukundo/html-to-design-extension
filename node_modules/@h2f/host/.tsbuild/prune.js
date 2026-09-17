/**
 * Drop nodes whose asset failed to resolve.
 *
 * An image layer with no image is worse than no layer: it imports as an
 * invisible empty frame that the designer has to hunt down and delete. A
 * dangling reference also fails capture validation outright, so every host has
 * to run this before writing a file.
 */
export function pruneMissingAssets(capture, warnings) {
    let dropped = 0;
    const visit = (node) => {
        const kind = node.kind;
        if ((kind === 'IMAGE' || kind === 'SVG') && !(String(node.asset) in capture.assets)) {
            dropped++;
            return false;
        }
        if (node.rasterize !== undefined && !(String(node.rasterize) in capture.assets)) {
            // The box itself is still meaningful even without its bitmap.
            delete node.rasterize;
        }
        if (Array.isArray(node.children)) {
            node.children = node.children.filter((child) => visit(child));
        }
        return true;
    };
    for (const root of capture.roots) {
        visit(root);
    }
    if (dropped > 0) {
        warnings.push({
            code: 'asset.dropped',
            message: `${dropped} image layer${dropped === 1 ? '' : 's'} removed because the source could not be fetched`,
        });
    }
}
/**
 * Remove raster placeholders the host never filled in — an element that
 * scrolled out of existence, or one the screenshot pass could not reach.
 */
export function dropUnresolvedRasters(capture) {
    for (const [ref, asset] of Object.entries(capture.assets)) {
        if (ref.startsWith('raster:') && asset.kind !== 'BITMAP' && asset.kind !== 'SVG') {
            delete capture.assets[ref];
        }
    }
}
//# sourceMappingURL=prune.js.map