import type { Corners, Stroke } from '@h2f/schema';
export interface BorderResult {
    stroke: Stroke | null;
    /** True when sides disagree on colour and only one could be kept. */
    mixedColors: boolean;
}
/**
 * Convert CSS borders into a single IR stroke.
 *
 * Figma allows per-side stroke *weights* but only one stroke *paint*. When
 * sides disagree on colour the thickest visible side wins and the caller is
 * told, so it can decide whether the element is worth rasterizing.
 */
export declare function parseBorder(style: CSSStyleDeclaration): BorderResult;
export interface CornerResult {
    corners: Corners;
    /** True when any corner used two different radii (an elliptical corner). */
    elliptical: boolean;
}
/**
 * Read `border-radius` into four scalar corner radii.
 *
 * Two CSS behaviours have to be reproduced here or shapes come out wrong:
 * elliptical corners (which Figma cannot represent) collapse to their smaller
 * radius, and oversized radii are scaled down by the CSS overlap rule — without
 * which `border-radius: 9999px` would produce a 9999px corner instead of a pill.
 */
export declare function parseCorners(style: CSSStyleDeclaration, width: number, height: number): CornerResult;
//# sourceMappingURL=border.d.ts.map