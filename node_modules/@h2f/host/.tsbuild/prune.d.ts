import type { Capture, Warning } from '@h2f/schema';
/**
 * Drop nodes whose asset failed to resolve.
 *
 * An image layer with no image is worse than no layer: it imports as an
 * invisible empty frame that the designer has to hunt down and delete. A
 * dangling reference also fails capture validation outright, so every host has
 * to run this before writing a file.
 */
export declare function pruneMissingAssets(capture: Capture, warnings: Warning[]): void;
/**
 * Remove raster placeholders the host never filled in — an element that
 * scrolled out of existence, or one the screenshot pass could not reach.
 */
export declare function dropUnresolvedRasters(capture: Capture): void;
//# sourceMappingURL=prune.d.ts.map