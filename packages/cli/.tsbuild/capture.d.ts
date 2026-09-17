import { type Capture } from '@h2f/schema';
import type { CaptureCommandOptions } from './options.js';
export interface CaptureRunResult {
    capture: Capture;
    screenshot: Buffer | null;
}
/** Shape of the global the capture bundle installs. */
interface CaptureGlobal {
    capture(options: Record<string, unknown>): Promise<Capture>;
    preparePage(options: Record<string, unknown>): Promise<void>;
}
declare global {
    var __h2f: CaptureGlobal;
}
export declare function runCapture(options: CaptureCommandOptions): Promise<CaptureRunResult>;
export {};
//# sourceMappingURL=capture.d.ts.map