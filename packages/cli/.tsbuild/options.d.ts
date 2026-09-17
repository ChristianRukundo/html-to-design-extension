import type { ColorScheme } from '@h2f/schema';
export interface CaptureCommandOptions {
    url: string;
    viewports: number[];
    viewportHeight: number;
    theme: ColorScheme;
    locale: string;
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    delay: number;
    clickSelectors: string[];
    hideSelectors: string[];
    autoLayout: boolean;
    deviceScaleFactor: number;
    maxImageDim: number;
    compress: boolean;
    screenshot: string | null;
    output: string;
    timeout: number;
    verbose: boolean;
    proxy: string | null;
    proxyBypass: string[];
    insecure: boolean;
}
export declare const USAGE = "\nh2f \u2014 capture a website as an editable Figma design\n\nUsage\n  h2f capture <url> [options]\n\nOptions\n  -o, --out <file>          Output path (default: capture.h2d.json)\n      --viewport <px>       Viewport width; repeat for multiple (default: 1920)\n      --viewport-height <px>  Viewport height (default: 1080)\n      --theme <light|dark>  Emulate a colour scheme (default: light)\n      --lang <locale>       Browser locale (default: en-US)\n      --wait <state>        load | domcontentloaded | networkidle | commit\n                            (default: networkidle)\n      --delay <ms>          Extra settle time after load (default: 500)\n      --click <selector>    Click before capturing; repeatable (cookie banners)\n      --hide <selector>     Remove before capturing; repeatable\n      --no-auto-layout      Emit everything absolutely positioned\n      --scale <n>           Device pixel ratio for images (default: 2)\n      --max-image-dim <px>  Downscale images above this size (default: 4096)\n      --compress            Write gzipped .h2d.gz instead of plain JSON\n      --screenshot <file>   Also save a reference PNG for visual comparison\n      --timeout <ms>        Navigation timeout (default: 60000)\n      --proxy <url>         HTTP proxy (default: $HTTPS_PROXY / $HTTP_PROXY)\n      --no-proxy            Ignore the proxy environment variables\n      --insecure            Accept invalid TLS certificates\n  -v, --verbose             Log progress\n  -h, --help                Show this message\n\nExamples\n  h2f capture https://example.com -o example.h2d.json\n  h2f capture https://example.com --viewport 1920 --viewport 390 --theme dark\n  h2f capture https://example.com --click \"#accept\" --screenshot ref.png\n";
export declare function parseCaptureArgs(argv: string[]): CaptureCommandOptions;
//# sourceMappingURL=options.d.ts.map