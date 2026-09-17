import type { LayoutSpec, Rect, SizingMode } from '@h2f/schema';
export interface LayoutChild {
    rect: Rect;
    /** `position: absolute | fixed | sticky` — takes the parent out of flow. */
    outOfFlow: boolean;
    /** Resolved `flex-grow`. */
    grow: number;
    /** True when the child stretches on the counter axis. */
    stretches: boolean;
}
export interface LayoutResult {
    layout: LayoutSpec;
    /** Sizing for each child, index-aligned with the input. */
    sizing: Array<{
        horizontal: SizingMode;
        vertical: SizingMode;
    }>;
}
/**
 * Decide whether a container can be reproduced as a Figma auto-layout frame,
 * and with what parameters.
 *
 * The inference works from *measured geometry* rather than from the CSS box
 * properties. That is deliberate: `margin` values do not survive margin
 * collapsing, `gap` does not account for a stray `margin-top` on one child, and
 * percentage padding resolves against a containing block that is not always the
 * parent. The rendered rectangles are the ground truth, and reproducing them is
 * the whole job.
 *
 * The CSS `display` value is still consulted, but only to pick the axis and to
 * recognise `space-between`.
 */
export declare function inferLayout(style: CSSStyleDeclaration, children: LayoutChild[], parent: {
    width: number;
    height: number;
}, autoLayoutEnabled: boolean): LayoutResult;
//# sourceMappingURL=layout.d.ts.map