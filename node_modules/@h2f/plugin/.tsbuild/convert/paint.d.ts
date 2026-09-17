import type { GradientPaint, Paint as IrPaint, Rgba } from '@h2f/schema';
/**
 * IR paints → Figma paints.
 *
 * Pure: no `figma` global, no side effects. Image paints need an image hash
 * that only the sandbox can mint, so it is passed in rather than looked up.
 */
export type ImageHashLookup = (assetRef: string) => string | null;
export declare function toPaints(paints: IrPaint[], lookup: ImageHashLookup): Paint[];
export declare function toPaint(paint: IrPaint, lookup: ImageHashLookup): Paint | null;
/**
 * Build Figma's `gradientTransform`.
 *
 * Figma defines a gradient in its own unit space and maps the layer into it
 * with this matrix — the inverse of how CSS thinks about gradients, which is
 * why this cannot just be an angle. For a linear gradient the matrix has to
 * send the layer's normalized coordinates to the gradient parameter `t`, so
 * that `t = 0` and `t = 1` land exactly on the ends of the CSS gradient line.
 */
export declare function gradientTransform(paint: GradientPaint): Transform;
export declare function toRgba(color: Rgba): RGBA;
export declare function toRgb(color: Rgba): RGB;
//# sourceMappingURL=paint.d.ts.map