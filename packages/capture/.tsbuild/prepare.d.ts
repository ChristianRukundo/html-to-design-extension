/**
 * Put the page into a stable, fully-rendered state before anything is measured.
 *
 * Skipping this step is the single biggest source of bad captures: lazy images
 * never load, scroll-triggered content stays hidden, webfonts swap in halfway
 * through the walk and every text measurement taken before the swap is wrong.
 */
export interface PrepareOptions {
    /** Pause between scroll steps, in ms. */
    scrollDelay: number;
    /** Extra settle time after scrolling back to the top. */
    settleDelay: number;
    /** Selectors to remove before capturing, e.g. cookie banners. */
    hideSelectors: string[];
}
export declare const DEFAULT_PREPARE_OPTIONS: PrepareOptions;
export declare function preparePage(options: PrepareOptions): Promise<void>;
export declare function delay(ms: number): Promise<void>;
//# sourceMappingURL=prepare.d.ts.map