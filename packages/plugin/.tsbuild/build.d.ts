import type { Capture, Warning } from '@h2f/schema';
import { toRgb } from './convert/paint.js';
import type { ImportOptions } from './messages.js';
/**
 * The slice of the Figma API the builder uses.
 *
 * Depending on this rather than the `figma` global is what lets the whole
 * builder run under a mock in Node, so the tree it produces can be asserted
 * without a Figma editor in the loop.
 */
export type BuilderApi = Pick<PluginAPI, 'createFrame' | 'createText' | 'createRectangle' | 'createImage' | 'createNodeFromSvg' | 'loadFontAsync' | 'listAvailableFontsAsync'>;
export interface BuildResult {
    roots: FrameNode[];
    layers: number;
    warnings: Warning[];
}
export interface BuildCallbacks {
    onProgress?(phase: string, done: number, total: number): void;
}
export declare class Builder {
    private readonly api;
    private readonly capture;
    private readonly assetBytes;
    private readonly options;
    private readonly callbacks;
    private readonly warnings;
    private readonly imageHashes;
    /**
     * Text layers whose box had to grow beyond the captured width to keep the
     * captured line breaks (Figma's font metrics rarely match the browser's to
     * the pixel). Value is the final width; positions and the layout check use
     * it instead of the captured width.
     */
    private readonly widthOverrides;
    /** How far a widened text layer must shift left so its glyphs stay put. */
    private readonly xNudges;
    private fonts;
    private layers;
    private sinceYield;
    constructor(api: BuilderApi, capture: Capture, assetBytes: Map<string, Uint8Array>, options: ImportOptions, callbacks?: BuildCallbacks);
    build(): Promise<BuildResult>;
    /**
     * Load every font before any text node exists.
     *
     * `createText` and every range setter throw if the font is not already
     * loaded, and the error surfaces far from the cause, so this happens up front
     * for the whole document.
     */
    private prepareFonts;
    private prepareImages;
    private lookupImage;
    private buildNode;
    private buildFrame;
    private buildText;
    /**
     * Size the box to the captured rect without letting the text re-wrap.
     *
     * The captured rect is measured against the browser's font; Figma's copy of
     * the same family (or a substitute) is usually a hair wider, and a box sized
     * to the browser's pixel re-wraps — "Acme" becomes "Acm / e" and everything
     * below the extra line is overlapped. So the box grows by the smallest amount
     * that restores the captured line count, and centred or right-aligned layers
     * are nudged left so the glyphs stay where they were captured.
     *
     * Under the Node mock, `resize` never reflows, so both measurements read back
     * the values just written and this is a no-op beyond the captured size.
     */
    private fitToCapture;
    /**
     * Apply per-range styling for inline runs.
     *
     * Each range setter can throw independently (an unloaded font, an out-of-
     * range index after `textCase` changed the character count), and losing one
     * bold word is much better than losing the whole paragraph — so each is
     * guarded on its own.
     */
    private applySegments;
    private buildImage;
    private buildSvg;
    /**
     * Apply inferred auto-layout, then check it actually reproduced the capture.
     *
     * This is the safety net that makes layout inference worth doing at all.
     * Auto-layout is a guess: Figma's box model is not CSS's, and a container
     * whose children Figma lays out even slightly differently would shift
     * everything inside it. So the result is measured against the captured
     * rectangles and reverted to absolute positioning if it does not match.
     * Auto-layout can therefore only ever be an improvement.
     */
    private applyLayout;
    private revertLayout;
}
export { toRgb };
//# sourceMappingURL=build.d.ts.map