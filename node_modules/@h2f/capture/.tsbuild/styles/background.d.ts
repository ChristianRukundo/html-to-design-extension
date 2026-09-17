import type { Paint } from '@h2f/schema';
import type { AssetRegistry } from '../assets.js';
import { type Box } from './gradient.js';
export interface BackgroundResult {
    paints: Paint[];
    /** Background layers that could not be converted, e.g. `element()`. */
    unsupported: string[];
}
/**
 * Convert `background-color` and the `background-image` layer list into IR
 * paints.
 *
 * The one subtlety that matters: CSS paints the *first* background layer on top
 * and Figma paints the *last* fill on top, so the layer list is reversed.
 * Getting this backwards silently hides every gradient that sits over an image.
 */
export declare function parseBackground(style: CSSStyleDeclaration, box: Box, assets: AssetRegistry): BackgroundResult;
/**
 * Pick one candidate out of `image-set(url(...) 1x, url(...) 2x, ...)`.
 *
 * The lowest density at or above 1x is the size the page actually rendered at
 * on a standard display; higher densities cost bytes for pixels Figma will
 * downscale anyway. Type hints are ignored — the host transcodes whatever
 * format comes back.
 */
export declare function pickFromImageSet(value: string): string | null;
//# sourceMappingURL=background.d.ts.map