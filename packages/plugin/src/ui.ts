import type { Capture } from '@h2f/schema';
import {
  DEFAULT_IMPORT_OPTIONS,
  type CodeToUi,
  type ImportOptions,
  type UiToCode,
  type WarningSummary,
} from './messages.js';

/**
 * Plugin UI.
 *
 * Runs in a normal browser iframe, so this side owns everything the Figma
 * sandbox cannot do: reading files, inflating gzip and decoding base64.
 */

const dropZone = required<HTMLElement>('#drop');
const fileInput = required<HTMLInputElement>('#file');
const status = required<HTMLElement>('#status');
const progressBar = required<HTMLElement>('#bar');
const progressWrap = required<HTMLElement>('#progress');
const warningsPanel = required<HTMLElement>('#warnings');
const autoLayoutToggle = required<HTMLInputElement>('#auto-layout');

let busy = false;
let batchQueue: File[] = [];
let batchTotal = 0;
let batchCompleted = 0;
let batchFailed = 0;
const batchErrors: string[] = [];
let completion: { resolve: () => void; reject: (error: Error) => void } | null = null;

// --- File intake ------------------------------------------------------------

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const files = fileInput.files ? Array.from(fileInput.files) : [];
  if (files.length > 0) void loadBatch(files);
  fileInput.value = '';
});

for (const eventName of ['dragenter', 'dragover'] as const) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('over');
  });
}

for (const eventName of ['dragleave', 'drop'] as const) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('over');
  });
}

dropZone.addEventListener('drop', (event) => {
  const files = (event as DragEvent).dataTransfer?.files;
  if (files && files.length > 0) void loadBatch(Array.from(files));
});

// The browser extension's "Copy for the Figma plugin" button puts the capture
// JSON on the clipboard; pasting anywhere in the plugin imports it, no file in
// between.
document.addEventListener('paste', (event) => {
  const text = (event as ClipboardEvent).clipboardData?.getData('text/plain');
  if (text && text.trimStart().startsWith('{')) void loadText(text, 'clipboard');
});

// --- Loading ----------------------------------------------------------------

async function loadBatch(files: File[]): Promise<void> {
  if (busy) {
    showError('An import is already in progress. Please wait for it to finish.');
    return;
  }

  batchQueue = files.filter(
    (file) =>
      file.name.endsWith('.json') || file.name.endsWith('.gz') || file.name.endsWith('.h2d'),
  );
  batchTotal = batchQueue.length;
  batchCompleted = 0;
  batchFailed = 0;
  batchErrors.length = 0;

  if (batchTotal === 0) {
    showError('Choose one or more .h2d.json or .h2d.gz capture files.');
    return;
  }

  busy = true;
  warningsPanel.textContent = '';

  while (batchQueue.length > 0) {
    const file = batchQueue.shift()!;
    try {
      setStatus(`Reading ${file.name} (${batchCompleted + batchFailed + 1}/${batchTotal})…`);
      const text = await readCaptureFile(file);
      await loadText(text, file.name, batchTotal > 1 ? pageNameFromFile(file.name) : undefined);
      batchCompleted++;
    } catch (error) {
      batchFailed++;
      const message = `${file.name}: ${(error as Error).message}`;
      batchErrors.push(message);
      showError(message);
    }
  }

  busy = false;
  progressWrap.style.display = 'none';
  setStatus(
    batchFailed === 0
      ? `Imported ${batchCompleted} capture${batchCompleted === 1 ? '' : 's'} successfully.`
      : `Imported ${batchCompleted}/${batchTotal}; ${batchFailed} failed.`,
  );
  if (batchErrors.length > 0) {
    warningsPanel.textContent = batchErrors.join('\n');
  }
}

async function loadText(text: string, sourceName: string, pageName?: string): Promise<void> {
  warningsPanel.textContent = '';

  try {
    setStatus(`Parsing ${sourceName}…`);
    const capture = JSON.parse(text) as Capture;

    if (!capture || typeof capture !== 'object' || !Array.isArray(capture.roots)) {
      throw new Error('That does not look like a capture file.');
    }

    await send(capture, pageName);
  } catch (error) {
    throw error;
  }
}

/**
 * Read a `.h2d.json` or gzipped `.h2d.gz` capture.
 *
 * `DecompressionStream` is available in the iframe (it is plain Chromium) and
 * nowhere in the Figma sandbox, which is exactly why decompression happens on
 * this side of the bridge.
 */
async function readCaptureFile(file: File): Promise<string> {
  const gzipped = file.name.endsWith('.gz') || (await isGzip(file));
  if (!gzipped) return file.text();

  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This build of Figma cannot read gzipped captures. Re-export without --compress.',
    );
  }

  const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function isGzip(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  return header[0] === 0x1f && header[1] === 0x8b;
}

/**
 * Hand the capture to the sandbox.
 *
 * Image bytes are stripped out of the document and streamed as separate
 * messages: a single `postMessage` carrying a page's worth of base64 images is
 * large enough to fail, and streaming gives a usable progress bar for free.
 */
async function send(capture: Capture, pageName?: string): Promise<void> {
  const options: ImportOptions = {
    ...DEFAULT_IMPORT_OPTIONS,
    autoLayout: autoLayoutToggle.checked,
  };

  const bitmaps: Array<{ ref: string; bytes: Uint8Array }> = [];

  for (const [ref, asset] of Object.entries(capture.assets)) {
    if (asset.kind !== 'BITMAP') continue;
    bitmaps.push({ ref, bytes: base64ToBytes(asset.bytes) });
    // The sandbox only needs the metadata; the bytes arrive separately.
    asset.bytes = '';
  }

  post({ type: 'begin', capture, options, assetCount: bitmaps.length, pageName });

  for (const [index, { ref, bytes }] of bitmaps.entries()) {
    post({ type: 'asset', ref, bytes });
    if (index % 10 === 0) {
      setProgress('Sending images', index + 1, bitmaps.length);
      // Yield so the progress bar actually repaints between batches.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  setStatus('Building layers…');
  const result = new Promise<void>((resolve, reject) => {
    completion = { resolve, reject };
  });
  post({ type: 'commit' });
  await result;
}

function pageNameFromFile(fileName: string): string {
  return (
    fileName
      .replace(/\.h2d\.json$/i, '')
      .replace(/\.h2d\.gz$/i, '')
      .replace(/\.json$/i, '')
      .replace(/\.gz$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'Imported capture'
  );
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Messages from the sandbox ----------------------------------------------

window.onmessage = (event: MessageEvent) => {
  const message = event.data?.pluginMessage as CodeToUi | undefined;
  if (!message) return;

  switch (message.type) {
    case 'progress':
      setProgress(message.phase, message.done, message.total);
      break;

    case 'done': {
      progressWrap.style.display = 'none';
      setStatus(
        `Imported ${message.layers.toLocaleString()} layers in ${(message.elapsedMs / 1000).toFixed(1)}s`,
      );
      renderWarnings(message.warnings);
      completion?.resolve();
      completion = null;
      break;
    }

    case 'error':
      showError(message.message);
      completion?.reject(new Error(message.message));
      completion = null;
      break;
  }
};

// --- Rendering --------------------------------------------------------------

function renderWarnings(warnings: WarningSummary[]): void {
  warningsPanel.textContent = '';
  if (warnings.length === 0) return;

  const heading = document.createElement('div');
  heading.className = 'warn-title';
  heading.textContent = `${warnings.length} thing${warnings.length === 1 ? '' : 's'} to check`;
  warningsPanel.appendChild(heading);

  for (const warning of warnings) {
    const row = document.createElement('div');
    row.className = 'warn';

    const label = document.createElement('span');
    label.textContent = warning.message;
    row.appendChild(label);

    if (warning.count > 1) {
      const badge = document.createElement('span');
      badge.className = 'count';
      badge.textContent = `×${warning.count}`;
      row.appendChild(badge);
    }

    warningsPanel.appendChild(row);
  }
}

function setStatus(text: string): void {
  status.textContent = text;
  status.classList.remove('error');
}

function showError(text: string): void {
  progressWrap.style.display = 'none';
  status.textContent = text;
  status.classList.add('error');
}

function setProgress(phase: string, done: number, total: number): void {
  progressWrap.style.display = 'block';
  status.classList.remove('error');
  status.textContent = total > 0 ? `${phase} ${done}/${total}` : phase;
  progressBar.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '100%';
}

function post(message: UiToCode): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing element ${selector}`);
  return element;
}
