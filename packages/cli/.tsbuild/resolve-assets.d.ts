import type { APIRequestContext, Page } from 'playwright';
import type { Capture, Warning } from '@h2f/schema';
export interface ResolveOptions {
    maxImageDim: number;
    verbose: boolean;
}
/**
 * Resolve every pending asset using Playwright.
 *
 * The orchestration — which assets to fetch, concurrency, what happens when one
 * fails, pruning the nodes that referenced it — lives in `@h2f/host` so the CLI
 * and the browser extension cannot drift apart. Only the two things Playwright
 * does differently are here.
 */
export declare function resolveAssets(capture: Capture, request: APIRequestContext, helperPage: Page, options: ResolveOptions): Promise<Warning[]>;
//# sourceMappingURL=resolve-assets.d.ts.map