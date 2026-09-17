import type { Capture } from '@h2f/schema';
/**
 * Combine per-viewport captures into a single document.
 *
 * Each capture numbers its nodes and assets from zero, so they are namespaced
 * before merging. Without that, the 1920px and 390px roots would both contain a
 * node called `n0` pointing at an asset called `img:0`, and the second capture
 * would silently overwrite the first.
 */
export declare function mergeCaptures(captures: Capture[]): Capture;
//# sourceMappingURL=merge.d.ts.map