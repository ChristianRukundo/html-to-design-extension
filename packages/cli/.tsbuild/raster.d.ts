import type { Page } from 'playwright';
import type { Capture, Warning } from '@h2f/schema';
/**
 * Screenshot every element the walker flagged as unconvertible.
 *
 * The walker tags those elements in the live DOM as it goes, so this pass is a
 * single selector query rather than a second tree walk — and it runs against
 * the same page state the measurements were taken from.
 */
export declare function rasterizeMarked(page: Page, capture: Capture, options: {
    verbose: boolean;
}): Promise<Warning[]>;
//# sourceMappingURL=raster.d.ts.map