import { DEFAULT_IMPORT_OPTIONS, } from './messages.js';
/**
 * Plugin UI.
 *
 * Runs in a normal browser iframe, so this side owns everything the Figma
 * sandbox cannot do: reading files, inflating gzip and decoding base64.
 */
const dropZone = required('#drop');
const fileInput = required('#file');
const status = required('#status');
const progressBar = required('#bar');
const progressWrap = required('#progress');
const warningsPanel = required('#warnings');
const autoLayoutToggle = required('#auto-layout');
let busy = false;
let batchQueue = [];
let batchTotal = 0;
let batchCompleted = 0;
let batchFailed = 0;
const batchErrors = [];
let completion = null;
// --- File intake ------------------------------------------------------------
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    const files = fileInput.files ? Array.from(fileInput.files) : [];
    if (files.length > 0)
        void loadBatch(files);
    fileInput.value = '';
});
for (const eventName of ['dragenter', 'dragover']) {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('over');
    });
}
for (const eventName of ['dragleave', 'drop']) {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('over');
    });
}
dropZone.addEventListener('drop', (event) => {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0)
        void loadBatch(Array.from(files));
});
// The browser extension's "Copy for the Figma plugin" button puts the capture
// JSON on the clipboard; pasting anywhere in the plugin imports it, no file in
// between.
document.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text/plain');
    if (text && text.trimStart().startsWith('{'))
        void loadText(text, 'clipboard');
});
// --- Loading ----------------------------------------------------------------
async function loadBatch(files) {
    if (busy) {
        showError('An import is already in progress. Please wait for it to finish.');
        return;
    }
    batchQueue = files.filter((file) => file.name.endsWith('.json') || file.name.endsWith('.gz') || file.name.endsWith('.h2d'));
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
        const file = batchQueue.shift();
        try {
            setStatus(`Reading ${file.name} (${batchCompleted + batchFailed + 1}/${batchTotal})…`);
            const text = await readCaptureFile(file);
            await loadText(text, file.name, batchTotal > 1 ? pageNameFromFile(file.name) : undefined);
            batchCompleted++;
        }
        catch (error) {
            batchFailed++;
            const message = `${file.name}: ${error.message}`;
            batchErrors.push(message);
            showError(message);
        }
    }
    busy = false;
    progressWrap.style.display = 'none';
    setStatus(batchFailed === 0
        ? `Imported ${batchCompleted} capture${batchCompleted === 1 ? '' : 's'} successfully.`
        : `Imported ${batchCompleted}/${batchTotal}; ${batchFailed} failed.`);
    if (batchErrors.length > 0) {
        warningsPanel.textContent = batchErrors.join('\n');
    }
}
async function loadText(text, sourceName, pageName) {
    warningsPanel.textContent = '';
    try {
        setStatus(`Parsing ${sourceName}…`);
        const capture = JSON.parse(text);
        if (!capture || typeof capture !== 'object' || !Array.isArray(capture.roots)) {
            throw new Error('That does not look like a capture file.');
        }
        await send(capture, pageName);
    }
    catch (error) {
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
async function readCaptureFile(file) {
    const gzipped = file.name.endsWith('.gz') || (await isGzip(file));
    if (!gzipped)
        return file.text();
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('This build of Figma cannot read gzipped captures. Re-export without --compress.');
    }
    const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
}
async function isGzip(file) {
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
async function send(capture, pageName) {
    const options = {
        ...DEFAULT_IMPORT_OPTIONS,
        autoLayout: autoLayoutToggle.checked,
    };
    const bitmaps = [];
    for (const [ref, asset] of Object.entries(capture.assets)) {
        if (asset.kind !== 'BITMAP')
            continue;
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
    const result = new Promise((resolve, reject) => {
        completion = { resolve, reject };
    });
    post({ type: 'commit' });
    await result;
}
function pageNameFromFile(fileName) {
    return (fileName
        .replace(/\.h2d\.json$/i, '')
        .replace(/\.h2d\.gz$/i, '')
        .replace(/\.json$/i, '')
        .replace(/\.gz$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100) || 'Imported capture');
}
function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);
    return bytes;
}
// --- Messages from the sandbox ----------------------------------------------
window.onmessage = (event) => {
    const message = event.data?.pluginMessage;
    if (!message)
        return;
    switch (message.type) {
        case 'progress':
            setProgress(message.phase, message.done, message.total);
            break;
        case 'done': {
            progressWrap.style.display = 'none';
            setStatus(`Imported ${message.layers.toLocaleString()} layers in ${(message.elapsedMs / 1000).toFixed(1)}s`);
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
function renderWarnings(warnings) {
    warningsPanel.textContent = '';
    if (warnings.length === 0)
        return;
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
function setStatus(text) {
    status.textContent = text;
    status.classList.remove('error');
}
function showError(text) {
    progressWrap.style.display = 'none';
    status.textContent = text;
    status.classList.add('error');
}
function setProgress(phase, done, total) {
    progressWrap.style.display = 'block';
    status.classList.remove('error');
    status.textContent = total > 0 ? `${phase} ${done}/${total}` : phase;
    progressBar.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '100%';
}
function post(message) {
    parent.postMessage({ pluginMessage: message }, '*');
}
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`missing element ${selector}`);
    return element;
}
//# sourceMappingURL=ui.js.map