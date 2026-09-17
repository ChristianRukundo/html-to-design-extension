/**
 * Viewport emulation through the debugger protocol.
 *
 * `Emulation.setDeviceMetricsOverride` is the only way an extension can reflow
 * a page to a width the window does not have — Chrome will not resize a window
 * below ~500px, which rules out every phone breakpoint. The cost is Chrome's
 * "started debugging this browser" banner for the duration of the capture; it
 * disappears again on detach.
 */
export declare class ViewportEmulator {
    private readonly tabId;
    private attached;
    constructor(tabId: number);
    setWidth(width: number): Promise<void>;
    /** Remove the override and the debugger banner. Safe to call repeatedly. */
    restore(): Promise<void>;
    /**
     * Wait until the page actually reflowed to the emulated width.
     *
     * The override is asynchronous: layout, media queries and any JS resize
     * handlers all run after the command returns. Polling `innerWidth` catches
     * the reflow; the trailing delay gives responsive images and resize
     * listeners a beat to finish.
     */
    private settle;
    private send;
}
//# sourceMappingURL=viewport.d.ts.map