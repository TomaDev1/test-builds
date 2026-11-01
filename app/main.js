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
