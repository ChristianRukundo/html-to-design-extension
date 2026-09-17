import type { Capture, Warning } from '@h2f/schema';
export interface RasterOptions {
    tabId: number;
    windowId: number;
    onProgress?: (done: number, total: number) => void;
    isCancelled?: () => boolean;
}
export declare function rasterizeMarked(capture: Capture, options: RasterOptions): Promise<Warning[]>;
//# sourceMappingURL=raster.d.ts.map