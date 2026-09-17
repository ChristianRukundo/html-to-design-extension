import { DEFAULT_SETTINGS, PHASE_LABELS, } from './protocol.js';
/**
 * The popup renders the worker's state and nothing else.
 *
 * It holds no capture, no progress counter and no result, because Chrome
 * destroys it the moment the user clicks away — which they will, since a real
 * page takes a while. Reopening it mid-capture reconnects to the run in
 * progress and picks the display back up.
 */
const el = (id) => {
    const found = document.getElementById(id);
    if (!found)
        throw new Error(`missing #${id}`);
    return found;
};
const sections = {
    options: el('options'),
    progress: el('progress'),
    result: el('result'),
    failure: el('failure'),
};
const autoLayout = el('auto-layout');
const compress = el('compress');
const hide = el('hide');
const viewportBoxes = [...el('viewports').querySelectorAll('input')];
const port = chrome.runtime.connect({ name: 'popup' });
let settings = { ...DEFAULT_SETTINGS };
/** Chunks of the capture JSON being streamed over for the clipboard. */
let jsonChunks = [];
port.onMessage.addListener((message) => {
    if (message.type === 'settings') {
        settings = message.settings;
        autoLayout.checked = settings.autoLayout;
        compress.checked = settings.compress;
        hide.value = settings.hideSelectors.join(', ');
        for (const box of viewportBoxes) {
            box.checked = (settings.viewports ?? [0]).includes(Number(box.value));
        }
        return;
    }
    if (message.type === 'captureJson') {
        jsonChunks.push(message.chunk);
        if (message.done)
            void copyToClipboard(jsonChunks.join(''));
        return;
    }
    if (message.type === 'copyUnavailable') {
        copyButton.disabled = false;
        copyButton.textContent = 'Expired — capture again first';
        return;
    }
    render(message.state);
});
void showCurrentPage();
el('capture').addEventListener('click', () => post({ type: 'start', settings: read() }));
el('again').addEventListener('click', () => post({ type: 'start', settings: read() }));
el('retry').addEventListener('click', () => post({ type: 'start', settings: read() }));
el('cancel').addEventListener('click', () => post({ type: 'cancel' }));
const copyButton = el('copy');
copyButton.addEventListener('click', () => {
    copyButton.disabled = true;
    copyButton.textContent = 'Copying…';
    jsonChunks = [];
    post({ type: 'copy' });
});
async function copyToClipboard(json) {
    jsonChunks = [];
    try {
        await navigator.clipboard.writeText(json);
        copyButton.textContent = 'Copied — paste in the plugin (Ctrl+V)';
    }
    catch {
        copyButton.textContent = 'Clipboard refused — use the saved file';
    }
    copyButton.disabled = false;
}
for (const input of [autoLayout, compress, hide, ...viewportBoxes]) {
    input.addEventListener('change', () => post({ type: 'saveSettings', settings: read() }));
}
function read() {
    const viewports = viewportBoxes.filter((box) => box.checked).map((box) => Number(box.value));
    settings = {
        ...settings,
        autoLayout: autoLayout.checked,
        compress: compress.checked,
        hideSelectors: hide.value
            .split(',')
            .map((selector) => selector.trim())
            .filter(Boolean),
        // Nothing ticked still means "capture something": the browser's width.
        viewports: viewports.length > 0 ? viewports : [0],
    };
    return settings;
}
function post(message) {
    port.postMessage(message);
}
function render(state) {
    show(state.status === 'idle'
        ? 'options'
        : state.status === 'running'
            ? 'progress'
            : state.status === 'done'
                ? 'result'
                : 'failure');
    if (state.status === 'running') {
        el('phase').textContent = `${PHASE_LABELS[state.phase]}…`;
        const ratio = state.total > 0 ? state.done / state.total : 0;
        el('bar').style.width = `${Math.round(ratio * 100)}%`;
        el('counts').textContent = state.total > 0 ? `${state.done} of ${state.total}` : '';
    }
    if (state.status === 'done')
        renderSummary(state.summary);
    if (state.status === 'error')
        el('message').textContent = state.message;
}
function show(name) {
    for (const [key, section] of Object.entries(sections)) {
        section.classList.toggle('hidden', key !== name);
    }
}
function renderSummary(summary) {
    copyButton.disabled = false;
    copyButton.textContent = 'Copy for the Figma plugin';
    const rows = [
        ['Layers', summary.layers.toLocaleString()],
        ['Assets', summary.assets.toLocaleString()],
        ['Fonts', summary.fonts.toLocaleString()],
        ['Size', formatBytes(summary.bytes)],
        ['Took', `${(summary.elapsedMs / 1000).toFixed(1)}s`],
    ];
    const stats = el('stats');
    stats.textContent = '';
    for (const [label, value] of rows) {
        const name = document.createElement('span');
        name.textContent = label;
        const amount = document.createElement('b');
        amount.textContent = value;
        stats.append(name, amount);
    }
    const warnings = el('warnings');
    warnings.textContent = '';
    for (const warning of summary.warnings) {
        const item = document.createElement('li');
        const code = document.createElement('span');
        code.textContent = warning.code;
        const count = document.createElement('span');
        count.textContent = `×${warning.count}`;
        item.append(code, count);
        warnings.append(item);
    }
    el('saved').textContent = `Saved as ${summary.filename}. Drop it onto the Figma plugin.`;
}
async function showCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    el('page').textContent = tab?.title || tab?.url || 'This page';
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} kB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
//# sourceMappingURL=popup.js.map