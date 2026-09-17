import { type Capture } from '@h2f/schema';
import type { CaptureSettings, Phase } from './protocol.js';
export interface RunContext {
    tabId: number;
    windowId: number;
    settings: CaptureSettings;
    report: (phase: Phase, done: number, total: number) => void;
    isCancelled: () => boolean;
}
export declare class CancelledError extends Error {
    constructor();
}
/**
 * Drive one capture of one tab.
 *
 * The order matches `packages/cli/src/capture.ts` deliberately: prepare, walk,
 * screenshot, then fetch. Screenshotting has to happen before the asset pass
 * because it scrolls the page, and the measurements the walk just took describe
 * the document as it stands right now.
 */
export declare function runCapture(context: RunContext): Promise<Capture>;
/**
 * Pages Chrome refuses to let an extension read, with an explanation a user can
 * act on. Without this the failure surfaces as a bare "Cannot access contents
 * of the page", which reads like a bug in the extension.
 */
export declare function blockedReason(url: string | undefined): Promise<string | null>;
export declare function captureFilename(capture: Capture, compress: boolean): string;
export declare function countLayers(capture: Capture): number;
export declare function groupWarnings(capture: Capture): {
    code: string;
    count: number;
}[];
//# sourceMappingURL=capture-run.d.ts.map