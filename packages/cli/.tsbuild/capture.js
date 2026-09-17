import { chromium } from 'playwright';
import { CAPTURE_BUNDLE } from '@h2f/capture/bundle';
import { validateCapture } from '@h2f/schema';
import { mergeCaptures } from '@h2f/host';
import { rasterizeMarked } from './raster.js';
import { resolveAssets } from './resolve-assets.js';
export async function runCapture(options) {
    const browser = await chromium.launch({
        headless: true,
        // Lets a sandboxed or air-gapped environment point at a Chromium it already
        // has, instead of requiring `playwright install` to reach the network.
        ...(process.env.H2F_CHROMIUM ? { executablePath: process.env.H2F_CHROMIUM } : {}),
        ...(options.proxy
            ? { proxy: { server: options.proxy, bypass: options.proxyBypass.join(',') } }
            : {}),
    });
    try {
        const captures = [];
        let screenshot = null;
        for (const [index, width] of options.viewports.entries()) {
            log(options, `capturing ${width}px`);
            const context = await browser.newContext({
                viewport: { width, height: options.viewportHeight },
                deviceScaleFactor: options.deviceScaleFactor,
                colorScheme: options.theme,
                locale: options.locale,
                // Needed behind a TLS-intercepting proxy, and for staging environments
                // with self-signed certificates.
                ignoreHTTPSErrors: options.insecure,
            });
            try {
                const result = await captureViewport(browser, context, width, options);
                captures.push(result.capture);
                if (index === 0)
                    screenshot = result.screenshot;
            }
            finally {
                await context.close();
            }
        }
        const merged = mergeCaptures(captures);
        const validation = validateCapture(merged);
        if (!validation.ok) {
            throw new Error(`The capture failed validation, which is a bug. Please report it with the URL.\n` +
                validation.errors
                    .slice(0, 10)
                    .map((e) => `  - ${e}`)
                    .join('\n'));
        }
        return { capture: merged, screenshot };
    }
    finally {
        await browser.close();
    }
}
async function captureViewport(browser, context, width, options) {
    const page = await context.newPage();
    const warnings = [];
    await page.goto(options.url, {
        waitUntil: options.waitUntil,
        timeout: options.timeout,
    });
    await dismissOverlays(page, options, warnings);
    if (options.delay > 0)
        await page.waitForTimeout(options.delay);
    // The bundle is injected rather than imported so the exact same file can be
    // shipped as an extension content script later.
    await page.evaluate(CAPTURE_BUNDLE);
    log(options, '  preparing page');
    await page.evaluate((hideSelectors) => globalThis.__h2f.preparePage({ scrollDelay: 60, settleDelay: 250, hideSelectors }), options.hideSelectors);
    log(options, '  walking the DOM');
    const capture = (await page.evaluate((input) => globalThis.__h2f.capture({
        viewportWidth: input.viewportWidth,
        colorScheme: input.colorScheme,
        locale: input.locale,
        autoLayout: input.autoLayout,
        // Preparation already ran; repeating the scroll pass would only cost
        // time and risk re-triggering reveal animations.
        skipPrepare: true,
    }), {
        viewportWidth: width,
        colorScheme: options.theme,
        locale: options.locale,
        autoLayout: options.autoLayout,
    }));
    capture.warnings.push(...warnings);
    // Screenshots have to happen before assets, because resolving assets may
    // navigate the helper page and we want the document untouched until then.
    capture.warnings.push(...(await rasterizeMarked(page, capture, options)));
    const helperPage = await context.newPage();
    try {
        capture.warnings.push(...(await resolveAssets(capture, context.request, helperPage, {
            maxImageDim: options.maxImageDim,
            verbose: options.verbose,
        })));
    }
    finally {
        await helperPage.close();
    }
    let screenshot = null;
    if (options.screenshot) {
        log(options, '  taking reference screenshot');
        await page.evaluate(() => window.scrollTo(0, 0));
        screenshot = await page.screenshot({ fullPage: true, type: 'png', animations: 'disabled' });
    }
    await page.close();
    return { capture, screenshot };
}
/**
 * Click away consent dialogs before capturing.
 *
 * A cookie banner is the single most common way an otherwise perfect capture
 * comes back as a full-page overlay, so failures here are reported rather than
 * swallowed — the user needs to know their selector did not match.
 */
async function dismissOverlays(page, options, warnings) {
    for (const selector of options.clickSelectors) {
        try {
            await page.click(selector, { timeout: 5000 });
            await page.waitForTimeout(200);
        }
        catch {
            warnings.push({
                code: 'click.notFound',
                message: `--click selector never matched: ${selector}`,
            });
        }
    }
}
function log(options, message) {
    if (options.verbose)
        process.stderr.write(`${message}\n`);
}
//# sourceMappingURL=capture.js.map