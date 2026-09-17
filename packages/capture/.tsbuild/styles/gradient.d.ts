import type { GradientPaint } from '@h2f/schema';
export interface Box {
    width: number;
    height: number;
}
/**
 * Parse a single CSS gradient function into a resolution-independent
 * `GradientPaint`.
 *
 * Angles use CSS semantics throughout (0° points up, clockwise); converting to
 * Figma's gradient transform matrix is the plugin's job.
 */
export declare function parseGradient(value: string, box: Box): GradientPaint | null;
export declare function isGradient(value: string): boolean;
/** Parse a background/gradient position into 0..1 fractions of the box. */
export declare function parsePosition(value: string, box: Box): {
    x: number;
    y: number;
};
//# sourceMappingURL=gradient.d.ts.map