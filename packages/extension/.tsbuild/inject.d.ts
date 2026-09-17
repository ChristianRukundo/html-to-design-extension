import type { Capture } from '@h2f/schema';
export interface RasterTarget {
    id: string;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Viewport size in CSS pixels, for working out the screenshot scale. */
    viewport: {
        width: number;
        height: number;
    };
}
/**
 * Load the capture engine.
 *
 * This is the same `capture.bundle.js` the CLI evaluates through Playwright,
 * byte for byte — the build copies it out of `@h2f/capture` untouched.
 */
export declare function injectEngine(tabId: number): Promise<void>;
export declare function preparePage(tabId: number, hideSelectors: string[]): Promise<void>;
export declare function walkPage(tabId: number, autoLayout: boolean): Promise<Capture>;
/** Ids of the elements the walker flagged as unconvertible, in document order. */
export declare function listRasterTargets(tabId: number, attribute?: string): Promise<string[]>;
/**
 * Scroll one flagged element into view and report where it landed.
 *
 * `captureVisibleTab` can only photograph the visible viewport, so every
 * element has to be brought into it first. Two animation frames after the
 * scroll is what makes the returned rectangle describe the pixels Chrome is
 * about to hand back rather than the ones it is still painting.
 */
export declare function focusRasterTarget(tabId: number, id: string, attribute?: string): Promise<RasterTarget | null>;
export declare function resetScroll(tabId: number): Promise<void>;
declare global {
    var __h2f: {
        capture(options: Record<string, unknown>): Promise<Capture>;
        preparePage(options: Record<string, unknown>): Promise<void>;
    };
}
//# sourceMappingURL=inject.d.ts.map