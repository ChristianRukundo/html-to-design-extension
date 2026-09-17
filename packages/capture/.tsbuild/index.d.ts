import { type Capture, type ColorScheme } from '@h2f/schema';
import { type PrepareOptions } from './prepare.js';
import { type WalkOptions } from './walk.js';
export { RASTER_ATTRIBUTE } from './walk.js';
export type { WalkOptions } from './walk.js';
export type { PrepareOptions } from './prepare.js';
export declare const GENERATOR = "@h2f/capture 1.0";
export interface CaptureOptions extends Partial<WalkOptions>, Partial<PrepareOptions> {
    /** Width the host set the viewport to; recorded on the root frame. */
    viewportWidth: number;
    colorScheme?: ColorScheme;
    locale?: string;
    /** Skip page preparation when the host has already done it. */
    skipPrepare?: boolean;
}
/**
 * Capture the current document.
 *
 * Returns a document whose assets are still `PENDING` — resolving those to
 * bytes is the host's job, because only the host can fetch cross-origin URLs
 * and screenshot elements.
 */
export declare function capture(options: CaptureOptions): Promise<Capture>;
//# sourceMappingURL=index.d.ts.map