import { dotnet } from './_framework/dotnet.js'

const splash = document.getElementById('splash');
const bar = document.getElementById('progress');
const note = document.getElementById('note');

function fail(message) {
  note.className = 'note err';
  note.textContent = message;
}

// The published site ships only gzip-compressed .wasm files (tools/web/compress.sh), so the runtime
// (~65 MB of WebAssembly) downloads as ~18 MB. We fetch the .gz and decompress it in the browser,
// which needs no special server support — GitHub Pages serves the raw .gz bytes as-is.
function gzipResourceLoader(type, name, defaultUri) {
  if (!defaultUri || !defaultUri.endsWith('.wasm')) return null;
  return (async () => {
    const resp = await fetch(defaultUri + '.gz');
    if (!resp.ok || !resp.body) return fetch(defaultUri); // fall back to an uncompressed copy if present
    const bytes = resp.body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(bytes, { headers: { 'Content-Type': 'application/wasm' } });
  })();
}

// File dialogs. The app awaits the browser's file pickers, and Avalonia only treats an error as "cancelled" when its
// message is exactly Chrome's English "The user aborted a request." Any other error from a picker crashes the .NET
// runtime and freezes the page. That happens when a work PC's browser policy blocks the save or open dialog, or when
// a browser words the cancel differently. So any picker error becomes one of these:
//  - a cancel the app understands, when the user really cancelled;
//  - a plain download (saving) or the classic file input (opening), when the browser refused the dialog.
const CANCEL = 'The user aborted a request.';
const cancelled = () => new DOMException(CANCEL, 'AbortError');

// Collects what the app writes, then hands it to the browser as an ordinary download
function downloadHandle(name) {
  const writable = () => {
    const parts = [];
    return {
      async write(chunk) {
        if (chunk && typeof chunk === 'object' && 'type' in chunk && !(chunk instanceof Blob)) {
          if (chunk.type !== 'write') return; // seek/truncate: the app writes start to finish
          chunk = chunk.data;
        }
        parts.push(chunk instanceof Blob ? chunk : (ArrayBuffer.isView(chunk) ? chunk.slice() : chunk));
      },
      async seek() {},
      async truncate() {},
      async abort() { parts.length = 0; },
      async close() {
        const url = URL.createObjectURL(new Blob(parts));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
    };
  };
  return {
    kind: 'file', name,
    async getFile() { return new File([], name); },
    async createWritable() { return writable(); },
    async queryPermission() { return 'granted'; },
    async requestPermission() { return 'granted'; },
    async isSameEntry(other) { return other === this; },
  };
}

// The classic <input type="file">, for when the open dialog is refused
function inputPicker(options) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = !!(options && options.multiple);
    const exts = (options && options.types || []).flatMap(t => Object.values(t.accept || {}).flat());
    if (exts.length) input.accept = exts.join(',');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const files = [...(input.files || [])];
      input.remove();
      if (!files.length) return reject(cancelled());
      resolve(files.map(file => ({
        kind: 'file', name: file.name,
        async getFile() { return file; },
        async queryPermission() { return 'granted'; },
        async requestPermission() { return 'granted'; },
        async isSameEntry(other) { return other === this; },
      })));
    });
    input.addEventListener('cancel', () => { input.remove(); reject(cancelled()); });
    input.click();
  });
}

function guardPickers() {
  const isCancel = e => e && e.name === 'AbortError';
  const save = window.showSaveFilePicker;
  if (typeof save === 'function') {
    window.showSaveFilePicker = async function (options) {
      const name = (options && options.suggestedName) || 'download';
      let handle;
      try {
        handle = await save.call(window, options);
      } catch (e) {
        if (isCancel(e)) throw cancelled();
        console.warn('The save dialog was refused, so the file downloads instead:', e);
        return downloadHandle(name);
      }
      // Writing can be refused too, after the dialog: fall back to a download of the same name
      const create = handle.createWritable.bind(handle);
      handle.createWritable = async (...args) => {
        try { return await create(...args); } catch (e) {
          console.warn('Writing the file was refused, so it downloads instead:', e);
          return downloadHandle(handle.name || name).createWritable();
        }
      };
      return handle;
    };
  }
  const open = window.showOpenFilePicker;
  if (typeof open === 'function') {
    window.showOpenFilePicker = async function (options) {
      try {
        return await open.call(window, options);
      } catch (e) {
        if (isCancel(e)) throw cancelled();
        console.warn('The open dialog was refused, so the classic file chooser is used:', e);
        return inputPicker(options);
      }
    };
  }
  const folder = window.showDirectoryPicker;
  if (typeof folder === 'function') {
    window.showDirectoryPicker = async function (options) {
      try {
        return await folder.call(window, options);
      } catch (e) {
        if (!isCancel(e)) console.warn('The folder dialog was refused:', e);
        throw cancelled(); // the app shows nothing chosen rather than crashing
      }
    };
  }
}
guardPickers();

// Right-click opens the app's own menus (cut/copy/paste on a port), so keep the browser's menu out of the way
document.addEventListener('contextmenu', e => e.preventDefault());

if (typeof WebAssembly !== 'object') {
  fail('This browser can’t run WebAssembly. Try a current Chrome, Edge, Firefox or Safari.');
} else if (typeof DecompressionStream !== 'function') {
  fail('This browser is too old to run the demo. Try a current Chrome, Edge, Firefox or Safari.');
} else {
  try {
    const runtime = await dotnet
      .withResourceLoader(gzipResourceLoader)
      .withModuleConfig({
        onDownloadResourceProgress: (loaded, total) => {
          if (!total) return;
          bar.style.width = Math.round(100 * loaded / total) + '%';
          note.textContent = `Downloading the app (${loaded} of ${total} files). The next visit loads from your browser's cache.`;
        },
      })
      .create();
    note.textContent = 'Starting...';
    bar.style.width = '100%';
    const started = runtime.runMain(runtime.getConfig().mainAssemblyName, []);
    // The app draws into #out once it has started; then the splash fades out
    const rendered = () => !!document.querySelector('#out canvas');
    const done = () => { splash.classList.add('gone'); setTimeout(() => splash.remove(), 400); };
    const watch = new MutationObserver(() => { if (rendered()) { watch.disconnect(); setTimeout(done, 300); } });
    watch.observe(document.getElementById('out'), { childList: true, subtree: true });
    try {
      await started;
    } catch (e) {
      console.error(e);
      // The single-threaded browser runtime throws on a blocking wait (e.g. "Cannot wait on
      // monitors on this runtime") even though the app keeps running and draws normally. Only
      // report a real failure: if the app never put up its canvas, give it a moment, then check.
      if (!rendered()) await new Promise(r => setTimeout(r, 2500));
      if (!rendered()) fail('SwitchForge couldn’t start in this browser: ' + (e && e.message ? e.message : e));
    }
  } catch (e) {
    console.error(e);
    fail('SwitchForge couldn’t start in this browser: ' + (e && e.message ? e.message : e));
  }
}
